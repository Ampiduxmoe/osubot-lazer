/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {
  AppUserApiRequestsCounts,
  AppUserApiRequestsCountsImpl,
} from '../../../src/main/data/raw/db/tables/AppUserApiRequestsCounts';
import {
  TimeWindows,
  TimeWindowsImpl,
} from '../../../src/main/data/raw/db/tables/TimeWindows';
import {SqlDbTable} from '../../../src/main/data/raw/db/SqlDbTable';
import {GetApiUsageSummaryUseCase} from '../../../src/main/domain/usecases/get_api_usage_summary/GetApiUsageSummaryUseCase';
import {TimeWindow} from '../../../src/main/data/raw/db/entities/TimeWindow';
import {AppUserApiRequestsCount} from '../../../src/main/data/raw/db/entities/AppUserApiRequestsCount';
import {GetApiUsageSummaryRequest} from '../../../src/main/domain/usecases/get_api_usage_summary/GetApiUsageSummaryRequest';

describe('GetApiUsageSummaryUseCase', function () {
  let tables: SqlDbTable<object, object>[];
  let appUserApiRequestsCounts: AppUserApiRequestsCounts;
  let timeWindows: TimeWindows;
  let usecase: GetApiUsageSummaryUseCase;
  {
    const db = new SqliteDb(':memory:');
    appUserApiRequestsCounts = new AppUserApiRequestsCountsImpl(db);
    timeWindows = new TimeWindowsImpl(db);
    const requestsSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      appUserApiRequestsCounts,
      timeWindows
    );

    tables = [appUserApiRequestsCounts, timeWindows];
    usecase = new GetApiUsageSummaryUseCase(requestsSummariesDao);
  }

  const exampleRequestsCount1: AppUserApiRequestsCount = {
    time_window_id: 1,
    app_user_id: 'appUserId1',
    target: 'target1',
    subtarget: 'subtarget1',
    count: 10,
  };
  const exampleRequestsCount2: AppUserApiRequestsCount = {
    time_window_id: 1,
    app_user_id: 'appUserId2',
    target: 'target1',
    subtarget: 'subtarget1',
    count: 20,
  };
  const exampleTimeWindow: TimeWindow = {
    id: 1,
    start_time: Date.parse('2000-01-01T12:00:00.000Z'),
    end_time: Date.parse('2000-01-01T12:30:00.000Z'),
  };

  before(async function () {
    await Promise.all(tables.map(t => t.createTable()));
    await timeWindows.add(exampleTimeWindow);
    await appUserApiRequestsCounts.add(exampleRequestsCount1);
    await appUserApiRequestsCounts.add(exampleRequestsCount2);
  });

  describe('#execute()', function () {
    it('should return TimeIntervalUsageSummary of zero length when there are no matching entries', async function () {
      const request: GetApiUsageSummaryRequest = {
        timeStart: 0,
        timeEnd: 1000,
        appUserId: undefined,
      };
      const result = await usecase.execute(request);
      assert.strictEqual(result.usageSummary.length, 0);
    });
    it('should return TimeIntervalUsageSummary of non-zero length when there are are matching entries', async function () {
      const request: GetApiUsageSummaryRequest = {
        timeStart: exampleTimeWindow.start_time,
        timeEnd: exampleTimeWindow.end_time,
        appUserId: undefined,
      };
      const result = await usecase.execute(request);
      assert.notStrictEqual(result.usageSummary.length, 0);
    });
    it('should correctly return user summary when app user id is specified', async function () {
      const request: GetApiUsageSummaryRequest = {
        timeStart: exampleTimeWindow.start_time,
        timeEnd: exampleTimeWindow.end_time,
        appUserId: exampleRequestsCount1.app_user_id,
      };
      const result = await usecase.execute(request);
      assert.strictEqual(result.usageSummary.length, 1);
      assert.strictEqual(result.usageSummary[0].appUsers.length, 1);
      assert.strictEqual(
        result.usageSummary[0].appUsers[0].appUserId,
        exampleRequestsCount1.app_user_id
      );
    });
  });
});
