/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {SqliteDb} from '../../../main/data/persistence/db/SqliteDb';
import {AppUserApiRequestsCountsTable} from '../../../main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {TimeWindowsTable} from '../../../main/data/persistence/db/tables/TimeWindowsTable';
import {SqlDbTable} from '../../../main/data/persistence/db/SqlDbTable';
import {AppUserApiRequestsSummariesDao} from '../../../main/application/requirements/dao/AppUserApiRequestsSummariesDao';
import {AppUserApiRequests} from '../../../main/application/requirements/dao/AppUserRecentApiRequestsDao';

describe('AppUserApiRequestsSummariesDao', function () {
  let tables: SqlDbTable[];
  let dao: AppUserApiRequestsSummariesDao;
  {
    const db = new SqliteDb(':memory:');
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsTable(db);
    const timeWindows = new TimeWindowsTable(db);

    tables = [appUserApiRequestsCounts, timeWindows];
    dao = new AppUserApiRequestsSummariesDaoImpl(
      appUserApiRequestsCounts,
      timeWindows
    );
  }

  const exampleAppUserApiRequests: AppUserApiRequests = {
    time: 123123,
    appUserId: 'ExampleAppUserId',
    target: 'ExampleTarget',
    subtarget: 'ExampleSubtarget',
    count: 123,
  };

  before(async function () {
    await Promise.all(tables.map(t => t.createTable()));
    dao.add(exampleAppUserApiRequests);
  });

  describe('#get()', function () {
    it('should return undefined when there is no matching entry', async function () {
      const result = await dao.get(
        123999,
        999999999999,
        exampleAppUserApiRequests.appUserId
      );
      assert.strictEqual(result.length, 0);
    });
    it('should return AppUserApiRequestsSummary when corresponding entry exists', async function () {
      const result = await dao.get(
        0,
        999999999999,
        exampleAppUserApiRequests.appUserId
      );
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].appUsers.length, 1);
      assert.strictEqual(result[0].appUsers[0].counts.length, 1);
      const requests = result[0].appUsers[0].counts[0];
      assert.strictEqual(requests.count, exampleAppUserApiRequests.count);
      assert.strictEqual(requests.target, exampleAppUserApiRequests.target);
      assert.strictEqual(
        requests.subtarget,
        exampleAppUserApiRequests.subtarget
      );
    });
  });
  describe('#add()', function () {
    it('should correctly stack counts to existing entry when adding same requests', async function () {
      await dao.add(exampleAppUserApiRequests);
      const result = await dao.get(
        0,
        999999999999,
        exampleAppUserApiRequests.appUserId
      );
      assert.strictEqual(result.length, 1);
      const requests = result[0].appUsers[0].counts[0];
      assert.strictEqual(requests.count, exampleAppUserApiRequests.count * 2);
    });
    it('should correctly stack counts to existing time window', async function () {
      exampleAppUserApiRequests.subtarget = 'new subtarget';
      await dao.add(exampleAppUserApiRequests);
      const result = await dao.get(
        0,
        999999999999,
        exampleAppUserApiRequests.appUserId
      );
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].appUsers[0].counts.length, 2);
      const requests = result[0].appUsers[0].counts.find(
        x => x.subtarget === exampleAppUserApiRequests.subtarget
      );
      assert.notStrictEqual(requests, undefined);
    });
    it('should correctly add counts to different time window', async function () {
      exampleAppUserApiRequests.time = 321321321321;
      await dao.add(exampleAppUserApiRequests);
      const result = await dao.get(
        0,
        999999999999,
        exampleAppUserApiRequests.appUserId
      );
      assert.strictEqual(result.length, 2);
    });
  });
});
