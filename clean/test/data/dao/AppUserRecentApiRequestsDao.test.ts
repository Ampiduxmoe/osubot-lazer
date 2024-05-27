/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {AppUserRecentApiRequestsDaoImpl} from '../../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {
  AppUserApiRequests,
  AppUserRecentApiRequestsDao,
} from '../../../src/main/data/dao/AppUserRecentApiRequestsDao';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserApiRequestsCountsImpl} from '../../../src/main/data/raw/db/tables/AppUserApiRequestsCounts';
import {TimeWindowsImpl} from '../../../src/main/data/raw/db/tables/TimeWindows';
import {SqlDbTable} from '../../../src/main/data/raw/db/SqlDbTable';

describe('AppUserRecentApiRequestsDao', function () {
  let tables: SqlDbTable<object, object>[];
  let dao: AppUserRecentApiRequestsDao;
  {
    const db = new SqliteDb(':memory:');
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsImpl(db);
    const timeWindows = new TimeWindowsImpl(db);
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
      assert.equal(result.length, 0);
    });
    it('should return AppUserApiRequests when corresponding entry exists', async function () {
      const result = await dao.get(
        exampleAppUserApiRequests.appUserId,
        exampleAppUserApiRequests.target
      );
      assert.equal(result.length, 1);
      assert.equal(result[0].subtarget, exampleAppUserApiRequests.subtarget);
      assert.equal(result[0].time, exampleAppUserApiRequests.time);
      assert.equal(result[0].count, exampleAppUserApiRequests.count);
    });
  });
  describe('#add()', function () {
    it('should correctly add entry', async function () {
      await dao.add(exampleAppUserApiRequests);
      const result = await dao.get(
        exampleAppUserApiRequests.appUserId,
        exampleAppUserApiRequests.target
      );
      assert.equal(result.length, 2);
      assert.equal(
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
      assert.equal(result.length, 0);
    });
  });
  describe('#events.onNewRequests.subscrube()', function () {
    it('should correctly handle new subscriptions', async function () {
      let localRequestsCount = 0;
      dao.events.onNewRequests.subscribe(requests => {
        localRequestsCount += requests.count;
      });
      await dao.add(exampleAppUserApiRequests);
      assert.equal(localRequestsCount, exampleAppUserApiRequests.count);
      assert.equal(exampleSubscribeCallbackInvokeCount, 3);
    });
  });
  describe('#events.onNewRequests.unsubscrube()', function () {
    it('after calling unsubscribe on callback it should not be called anymore', async function () {
      dao.events.onNewRequests.unsubscribe(exampleSubscribeCallback);
      await dao.add(exampleAppUserApiRequests);
      assert.equal(exampleSubscribeCallbackInvokeCount, 3);
    });
  });
});
