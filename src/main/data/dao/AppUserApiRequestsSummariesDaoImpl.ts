import {Timespan} from '../../primitives/Timespan';
import {TimeWindow} from '../repository/models/TimeWindow';
import {AppUserApiRequests} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {AppUserApiRequestsSummariesDao} from '../../application/requirements/dao/AppUserApiRequestsSummariesDao';
import {AppUserApiRequestsSummary} from '../../application/requirements/dao/AppUserApiRequestsSummariesDao';
import {AppUserApiRequestsCountsRepository} from '../repository/repositories/AppUserApiRequestsCountsRepository';
import {TimeWindowsRepository} from '../repository/repositories/TimeWindowsRepository';

export class AppUserApiRequestsSummariesDaoImpl
  implements AppUserApiRequestsSummariesDao
{
  private bucketTimeWindow = new Timespan().addMinutes(20);
  constructor(
    protected requestsCounts: AppUserApiRequestsCountsRepository,
    protected timeWindows: TimeWindowsRepository
  ) {}

  async add(requests: AppUserApiRequests): Promise<void> {
    const requestsTime = requests.time;
    const requestsDate = new Date(requestsTime);
    const {startTime, endTime} = this.getDayStartAndEnd(requestsDate);
    let targetDayWindows = await this.timeWindows.getAllByTimeInterval(
      startTime,
      endTime
    );
    if (targetDayWindows.length === 0) {
      // It can skip cleanup on the day before if no requests are added,
      // but it will be enough to keep database table mostly clean.
      // For remaining windows we can just do it manually in raw SQL once in a while.
      const timeForDayBefore = new Date(requestsDate).setUTCDate(
        requestsDate.getUTCDate() - 1
      );
      await this.cleanUpUnusedTimeWindowsForDate(new Date(timeForDayBefore));
      await this.createTimeWindowsForDate(requestsDate);
      targetDayWindows = await this.timeWindows.getAllByTimeInterval(
        startTime,
        endTime
      );
    }
    const fittingTimeWindow = targetDayWindows.find(
      w => w.startTime < requestsTime && w.endTime > requestsTime
    )!;
    const existingRequestsCount = await this.requestsCounts.get({
      timeWindowId: fittingTimeWindow.id,
      appUserId: requests.appUserId,
      target: requests.target,
      subtarget: requests.subtarget ?? null,
    });
    if (existingRequestsCount !== undefined) {
      existingRequestsCount.count += requests.count;
      this.requestsCounts.update(existingRequestsCount);
      return;
    }
    this.requestsCounts.add({
      timeWindowId: fittingTimeWindow.id,
      appUserId: requests.appUserId,
      target: requests.target,
      subtarget: requests.subtarget ?? null,
      count: requests.count,
    });
  }

  async get(
    timeStart: number,
    timeEnd: number,
    targetAppUserId: string | undefined
  ): Promise<AppUserApiRequestsSummary[]> {
    const timeWindows = await this.timeWindows.getAllByTimeInterval(
      timeStart,
      timeEnd
    );
    if (timeWindows.length === 0) {
      return [];
    }
    const requestsCounts =
      targetAppUserId === undefined
        ? await this.requestsCounts.getAllByTimeWindows(
            timeWindows.map(w => w.id)
          )
        : await this.requestsCounts.getAllByAppUserAndTimeWindows(
            targetAppUserId,
            timeWindows.map(w => w.id)
          );
    const byTimeWindows: {
      [timeWindowId: number]: {
        [appUserId: string]: {
          target: string;
          subtarget: string | null;
          count: number;
        }[];
      };
    } = {};
    for (const requestCount of requestsCounts) {
      const timeWindowId = requestCount.timeWindowId;
      if (byTimeWindows[timeWindowId] === undefined) {
        byTimeWindows[timeWindowId] = {};
      }
      const appUserId = requestCount.appUserId;
      if (byTimeWindows[timeWindowId][appUserId] === undefined) {
        byTimeWindows[timeWindowId][appUserId] = [];
      }
      byTimeWindows[timeWindowId][appUserId].push({
        target: requestCount.target,
        subtarget: requestCount.subtarget,
        count: requestCount.count,
      });
    }
    const result: AppUserApiRequestsSummary[] = [];
    for (const timeWindow of timeWindows) {
      const timeWindowData = byTimeWindows[timeWindow.id];
      if (timeWindowData === undefined) {
        continue;
      }
      const appUsers: {
        appUserId: string;
        counts: {
          target: string;
          subtarget: string | null;
          count: number;
        }[];
      }[] = [];
      for (const appUserId in timeWindowData) {
        appUsers.push({
          appUserId: appUserId,
          counts: timeWindowData[appUserId],
        });
      }
      result.push({
        timeWindowStart: timeWindow.startTime,
        timeWindowEnd: timeWindow.endTime,
        appUsers: appUsers,
      });
    }
    return result;
  }

  private getDayStartAndEnd(date: Date): {startTime: number; endTime: number} {
    const day = new Date(date);
    const dayStart = day.setUTCHours(0, 0, 0, 0);
    const dayEnd = day.setUTCHours(23, 59, 59, 999);
    return {startTime: dayStart, endTime: dayEnd};
  }

  private async cleanUpUnusedTimeWindowsForDate(date: Date): Promise<void> {
    const targetDayInterval = this.getDayStartAndEnd(date);
    const targetDayTimeWindows = await this.timeWindows.getAllByTimeInterval(
      targetDayInterval.startTime,
      targetDayInterval.endTime
    );
    if (
      targetDayTimeWindows === undefined ||
      targetDayTimeWindows.length === 0
    ) {
      return;
    }
    const targetDayRequestsCounts =
      await this.requestsCounts.getAllByTimeWindows(
        targetDayTimeWindows.map(w => w.id)
      );
    const usedWindowIds = targetDayRequestsCounts.map(s => s.timeWindowId);
    const unusedWindows = targetDayTimeWindows.filter(
      w => !usedWindowIds.includes(w.id)
    );
    await this.timeWindows.deleteAll(unusedWindows);
    console.log(
      `Successfully deleted ${unusedWindows.length} of unused requests time windows`
    );
  }

  private async createTimeWindowsForDate(date: Date): Promise<void> {
    const targetDayInterval = this.getDayStartAndEnd(date);
    const targetDayStart = targetDayInterval.startTime;
    const targetDayEnd = targetDayInterval.endTime;
    const dayLength = targetDayEnd - targetDayStart;
    const bucketTimeWindowMs = this.bucketTimeWindow.totalMiliseconds();
    const lastIntervalMergeMaxSize = 1.4;
    const smallestPossibleIntervalSize = lastIntervalMergeMaxSize - 1;
    const bucketCount = Math.floor(
      dayLength / bucketTimeWindowMs + (1 - smallestPossibleIntervalSize)
    );
    const targetDayWindows: TimeWindow[] = [];
    let i: number;
    for (i = 0; i < bucketCount - 1; i++) {
      const bucketStartTime = targetDayStart + i * bucketTimeWindowMs;
      const bucketEndTime = targetDayStart + (i + 1) * bucketTimeWindowMs - 1;
      targetDayWindows.push({
        id: -1,
        startTime: bucketStartTime,
        endTime: bucketEndTime,
      });
    }
    const lastBucketStartTime = targetDayStart + i * bucketTimeWindowMs;
    const lastBucketEndTime = targetDayEnd;
    targetDayWindows.push({
      id: -1,
      startTime: lastBucketStartTime,
      endTime: lastBucketEndTime,
    });
    await this.timeWindows.addAllWithoutIds(targetDayWindows);
  }
}

export const COMMON_REQUEST_SUBTARGETS = {
  osuUserInfo: 'user_info',
  userRecentPlays: 'user_recent_plays',
  userBestPlays: 'user_best_plays',
  beatmapInfo: 'beatmap_info',
  beatmapInfoByHash: 'beatmap_lookup',
  beatmapUserScores: 'beatmap_user_scores',
  beatmapsetInfo: 'beatmapset_info',
};
