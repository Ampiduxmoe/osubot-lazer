/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {SqliteDb} from '../../../src/main/data/persistence/db/SqliteDb';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserApiRequestsCountsTable} from '../../../src/main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {TimeWindowsTable} from '../../../src/main/data/persistence/db/tables/TimeWindowsTable';
import {SqlDbTable} from '../../../src/main/data/persistence/db/SqlDbTable';
import {GetApiUsageSummaryUseCase} from '../../../src/main/application/usecases/get_api_usage_summary/GetApiUsageSummaryUseCase';
import {TimeWindow} from '../../../src/main/data/repository/models/TimeWindow';
import {AppUserApiRequestsCount} from '../../../src/main/data/repository/models/AppUserApiRequestsCount';
import {GetApiUsageSummaryRequest} from '../../../src/main/application/usecases/get_api_usage_summary/GetApiUsageSummaryRequest';

describe('GetApiUsageSummaryUseCase', function () {
  let tables: SqlDbTable[];
  let appUserApiRequestsCounts: AppUserApiRequestsCountsTable;
  let timeWindows: TimeWindowsTable;
  let usecase: GetApiUsageSummaryUseCase;
  {
    const db = new SqliteDb(':memory:');
    appUserApiRequestsCounts = new AppUserApiRequestsCountsTable(db);
    timeWindows = new TimeWindowsTable(db);
    const requestsSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      appUserApiRequestsCounts,
      timeWindows
    );

    tables = [appUserApiRequestsCounts, timeWindows];
    usecase = new GetApiUsageSummaryUseCase(requestsSummariesDao);
  }

  const exampleRequestsCount1: AppUserApiRequestsCount = {
    timeWindowId: 1,
    appUserId: 'appUserId1',
    target: 'target1',
    subtarget: 'subtarget1',
    count: 10,
  };
  const exampleRequestsCount2: AppUserApiRequestsCount = {
    timeWindowId: 1,
    appUserId: 'appUserId2',
    target: 'target1',
    subtarget: 'subtarget1',
    count: 20,
  };
  const exampleTimeWindow: TimeWindow = {
    id: 1,
    startTime: Date.parse('2000-01-01T12:00:00.000Z'),
    endTime: Date.parse('2000-01-01T12:30:00.000Z'),
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
        timeStart: exampleTimeWindow.startTime,
        timeEnd: exampleTimeWindow.endTime,
        appUserId: undefined,
      };
      const result = await usecase.execute(request);
      assert.notStrictEqual(result.usageSummary.length, 0);
    });
    it('should correctly return user summary when app user id is specified', async function () {
      const request: GetApiUsageSummaryRequest = {
        timeStart: exampleTimeWindow.startTime,
        timeEnd: exampleTimeWindow.endTime,
        appUserId: exampleRequestsCount1.appUserId,
      };
      const result = await usecase.execute(request);
      assert.strictEqual(result.usageSummary.length, 1);
      assert.strictEqual(result.usageSummary[0].appUsers.length, 1);
      assert.strictEqual(
        result.usageSummary[0].appUsers[0].appUserId,
        exampleRequestsCount1.appUserId
      );
    });
  });
});
