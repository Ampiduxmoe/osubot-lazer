import {Timespan} from '../../../primitives/Timespan';
import {SqlDbTable} from '../raw/db/SqlDbTable';
import {
  AppUserApiRequestsCount,
  AppUserApiRequestsCountKey,
} from '../raw/db/entities/AppUserApiRequestsCount';
import {TimeWindow, TimeWindowKey} from '../raw/db/entities/TimeWindow';
import {AppUserApiRequestsSummariesDao} from './AppUserApiRequestsSummariesDao';
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
    const existingSummaries =
      (await this.requestsCounts.get({
        time_window_ids: [fittingTimeWindow.id],
        app_user_id: requests.appUserId,
      })) ?? [];
    const summary = existingSummaries.find(
      s => s.target === requests.target && s.subtarget === requests.subtarget
    );
    if (summary === undefined) {
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
    summary.count += requests.count;
    this.requestsCounts.update([summary]);
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
    const yesterdaySummaries =
      (await this.requestsCounts.get({
        time_window_ids: yesterdayTimeWindows.map(w => w.id),
      })) ?? [];
    const usedWindowIds = yesterdaySummaries.map(s => s.time_window_id);
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

export interface AppUserApiRequestsSummary {
  time_window_start: number;
  time_window_end: number;
  app_users: {
    app_user_id: string;
    counts: {
      target: string;
      subtarget: string | null;
      count: number;
    }[];
  }[];
}
