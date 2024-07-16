/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {AppUserRecentApiRequestsDaoImpl} from '../../../main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {SqliteDb} from '../../../main/data/persistence/db/SqliteDb';
import {
  AppUserApiRequests,
  AppUserRecentApiRequestsDao,
} from '../../../main/application/requirements/dao/AppUserRecentApiRequestsDao';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserApiRequestsCountsTable} from '../../../main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {TimeWindowsTable} from '../../../main/data/persistence/db/tables/TimeWindowsTable';
import {SqlDbTable} from '../../../main/data/persistence/db/SqlDbTable';

describe('AppUserRecentApiRequestsDao', function () {
  let tables: SqlDbTable[];
  let dao: AppUserRecentApiRequestsDao;
  {
    const db = new SqliteDb(':memory:');
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsTable(db);
    const timeWindows = new TimeWindowsTable(db);
    const requestsSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      appUserApiRequestsCounts,
      timeWindows
    );

    tables = [appUserApiRequestsCounts, timeWindows];
    dao = new AppUserRecentApiRequestsDaoImpl(requestsSummariesDao);
  }

  const exampleAppUserApiRequests: AppUserApiRequests = {
    time: 123123,
    appUserId: 'ExampleAppUserId',
    target: 'ExampleTarget',
    subtarget: 'ExampleSubtarget',
    count: 123,
  };
  let exampleSubscribeCallbackInvokeCount = 0;
  const exampleSubscribeCallback = () => {
    exampleSubscribeCallbackInvokeCount += 1;
  };

  before(async function () {
    await Promise.all(tables.map(t => t.createTable()));
    dao.events.onNewRequests.subscribe(exampleSubscribeCallback);
    dao.add(exampleAppUserApiRequests);
  });

  describe('#get()', function () {
    it('should return undefined when there is no matching entry', async function () {
      const result = await dao.get(
        'app user id that does not exist',
        'target that does not exist'
      );
      assert.strictEqual(result.length, 0);
    });
    it('should return AppUserApiRequests when corresponding entry exists', async function () {
      const result = await dao.get(
        exampleAppUserApiRequests.appUserId,
        exampleAppUserApiRequests.target
      );
      assert.strictEqual(result.length, 1);
      assert.strictEqual(
        result[0].subtarget,
        exampleAppUserApiRequests.subtarget
      );
      assert.strictEqual(result[0].time, exampleAppUserApiRequests.time);
      assert.strictEqual(result[0].count, exampleAppUserApiRequests.count);
    });
  });
  describe('#add()', function () {
    it('should correctly add entry', async function () {
      await dao.add(exampleAppUserApiRequests);
      const result = await dao.get(
        exampleAppUserApiRequests.appUserId,
        exampleAppUserApiRequests.target
      );
      assert.strictEqual(result.length, 2);
      assert.strictEqual(
        result[0].count + result[1].count,
        exampleAppUserApiRequests.count * 2
      );
    });
  });
  describe('#cleanUp()', function () {
    it('should remove all entries', async function () {
      await dao.cleanUp();
      const result = await dao.get(
        exampleAppUserApiRequests.appUserId,
        exampleAppUserApiRequests.target
      );
      assert.strictEqual(result.length, 0);
    });
  });
  describe('#events.onNewRequests.subscrube()', function () {
    it('should correctly handle new subscriptions', async function () {
      let localRequestsCount = 0;
      dao.events.onNewRequests.subscribe(requests => {
        localRequestsCount += requests.count;
      });
      await dao.add(exampleAppUserApiRequests);
      assert.strictEqual(localRequestsCount, exampleAppUserApiRequests.count);
      assert.strictEqual(exampleSubscribeCallbackInvokeCount, 3);
    });
  });
  describe('#events.onNewRequests.unsubscrube()', function () {
    it('after calling unsubscribe on callback it should not be called anymore', async function () {
      dao.events.onNewRequests.unsubscribe(exampleSubscribeCallback);
      await dao.add(exampleAppUserApiRequests);
      assert.strictEqual(exampleSubscribeCallbackInvokeCount, 3);
    });
  });
});
