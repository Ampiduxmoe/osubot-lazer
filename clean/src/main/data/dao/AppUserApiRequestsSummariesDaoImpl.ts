import {Timespan} from '../../../primitives/Timespan';
import {SqlDbTable} from '../raw/db/SqlDbTable';
import {
  AppUserApiRequestsCount,
  AppUserApiRequestsCountKey,
} from '../raw/db/entities/AppUserApiRequestsCount';
import {TimeWindow, TimeWindowKey} from '../raw/db/entities/TimeWindow';
import {
  AppUserApiRequestsSummariesDao,
  AppUserApiRequestsSummary,
} from './AppUserApiRequestsSummariesDao';
import {AppUserApiRequests} from './AppUserRecentApiRequestsDao';

export class AppUserApiRequestsSummariesDaoImpl
  implements AppUserApiRequestsSummariesDao
{
  private bucketTimeWindow = new Timespan().addMinutes(20);
  private requestsCounts: SqlDbTable<
    AppUserApiRequestsCount[],
    AppUserApiRequestsCountKey
  >;
  private timeWindows: SqlDbTable<TimeWindow[], TimeWindowKey>;
  constructor(
    requestsCounts: SqlDbTable<
      AppUserApiRequestsCount[],
      AppUserApiRequestsCountKey
    >,
    timeWindows: SqlDbTable<TimeWindow[], TimeWindowKey>
  ) {
    this.requestsCounts = requestsCounts;
    this.timeWindows = timeWindows;
  }

  async add(requests: AppUserApiRequests): Promise<void> {
    const {startTime, endTime} = this.getTodayStartAndEnd();
    const searchKey = {
      start_time: startTime,
      end_time: endTime,
    };
    let todayTimeWindows = await this.timeWindows.get(searchKey);
    if (todayTimeWindows === undefined || todayTimeWindows.length === 0) {
      // It can skip yesterday cleanup if 0 requests were added today,
      // but it will do good enough job most of the time.
      // For remaining windows we can just do it manually in raw SQL once in a while.
      await this.cleanUpUnusedTimeWindowsForYesterday();
      await this.createTimeWindowsForToday();
      todayTimeWindows = await this.timeWindows.get(searchKey);
      todayTimeWindows = todayTimeWindows!;
    }
    const targetTime = requests.time;
    const fittingTimeWindow = todayTimeWindows.find(
      w => w.start_time < targetTime && w.end_time > targetTime
    )!;
    const existingRequestsCounts =
      (await this.requestsCounts.get({
        time_window_ids: [fittingTimeWindow.id],
        app_user_id: requests.appUserId,
      })) ?? [];
    const requestCount = existingRequestsCounts.find(
      s => s.target === requests.target && s.subtarget === requests.subtarget
    );
    if (requestCount === undefined) {
      this.requestsCounts.add([
        {
          time_window_id: fittingTimeWindow.id,
          app_user_id: requests.appUserId,
          target: requests.target,
          subtarget: requests.subtarget ?? null,
          count: requests.count,
        },
      ]);
      return;
    }
    requestCount.count += requests.count;
    this.requestsCounts.update([requestCount]);
  }

  async get(
    timeStart: number,
    timeEnd: number,
    targetAppUserId: string | undefined
  ): Promise<AppUserApiRequestsSummary[]> {
    const timeWindows = await this.timeWindows.get({
      start_time: timeStart,
      end_time: timeEnd,
    });
    if (timeWindows === undefined || timeWindows.length === 0) {
      return [];
    }
    const requestsCounts =
      (await this.requestsCounts.get({
        time_window_ids: timeWindows.map(w => w.id),
        app_user_id: targetAppUserId,
      })) ?? [];
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
      const timeWindowId = requestCount.time_window_id;
      if (byTimeWindows[timeWindowId] === undefined) {
        byTimeWindows[timeWindowId] = {};
      }
      const appUserId = requestCount.app_user_id;
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
        timeWindowStart: timeWindow.start_time,
        timeWindowEnd: timeWindow.end_time,
        appUsers: appUsers,
      });
    }
    return result;
  }

  private getTodayStartAndEnd(): {startTime: number; endTime: number} {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart.getTime());
    tomorrowStart.setDate(todayStart.getDate() + 1);
    const todayEnd = new Date(tomorrowStart.getTime() - 1);
    return {startTime: todayStart.getTime(), endTime: todayEnd.getTime()};
  }

  private getYesterdayStartAndEnd(): {startTime: number; endTime: number} {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart.getTime());
    yesterdayStart.setDate(todayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart.getTime() - 1);
    return {
      startTime: yesterdayStart.getTime(),
      endTime: yesterdayEnd.getTime(),
    };
  }

  private async cleanUpUnusedTimeWindowsForYesterday(): Promise<void> {
    const yesterdayInterval = this.getYesterdayStartAndEnd();
    const yesterdayTimeWindows = await this.timeWindows.get({
      start_time: yesterdayInterval.startTime,
      end_time: yesterdayInterval.endTime,
    });
    if (
      yesterdayTimeWindows === undefined ||
      yesterdayTimeWindows.length === 0
    ) {
      return;
    }
    const yesterdayRequestsCounts =
      (await this.requestsCounts.get({
        time_window_ids: yesterdayTimeWindows.map(w => w.id),
      })) ?? [];
    const usedWindowIds = yesterdayRequestsCounts.map(s => s.time_window_id);
    const unusedWindows = yesterdayTimeWindows.filter(
      w => !usedWindowIds.includes(w.id)
    );
    await this.timeWindows.delete(unusedWindows);
    console.log(
      `Successfully deleted ${unusedWindows.length} of unused requests time windows`
    );
  }

  private async createTimeWindowsForToday(): Promise<void> {
    const todayInterval = this.getTodayStartAndEnd();
    const todayStart = todayInterval.startTime;
    const todayEnd = todayInterval.endTime;
    const dayLength = todayEnd - todayStart;
    const bucketTimeWindowMs = this.bucketTimeWindow.totalMiliseconds();
    const lastIntervalMergeMaxSize = 1.4;
    const smallestPossibleIntervalSize = lastIntervalMergeMaxSize - 1;
    const bucketCount = Math.floor(
      dayLength / bucketTimeWindowMs + (1 - smallestPossibleIntervalSize)
    );
    const todayWindows: TimeWindow[] = [];
    let i: number;
    for (i = 0; i < bucketCount - 1; i++) {
      const bucketStartTime = todayStart + i * bucketTimeWindowMs;
      const bucketEndTime = todayStart + (i + 1) * bucketTimeWindowMs - 1;
      todayWindows.push({
        id: -1,
        start_time: bucketStartTime,
        end_time: bucketEndTime,
      });
    }
    const lastBucketStartTime = todayStart + i * bucketTimeWindowMs;
    const lastBucketEndTime = todayEnd;
    todayWindows.push({
      id: -1,
      start_time: lastBucketStartTime,
      end_time: lastBucketEndTime,
    });
    await this.timeWindows.add(todayWindows);
  }
}
