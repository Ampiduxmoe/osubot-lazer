/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {OsuUsersDaoImpl} from '../../../src/main/data/dao/OsuUsersDaoImpl';
import {FakeBanchoApi} from '../../mocks/data/raw/http/BanchoApi';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {getFakeOsuUserUsername} from '../../mocks/Generators';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {OsuRuleset} from '../../../src/primitives/OsuRuleset';
import {OsuUserSnapshotsImpl} from '../../../src/main/data/raw/db/tables/OsuUserSnapshots';
import {AppUserRecentApiRequestsDaoImpl} from '../../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUserApiRequestsCountsImpl} from '../../../src/main/data/raw/db/tables/AppUserApiRequestsCounts';
import {TimeWindowsImpl} from '../../../src/main/data/raw/db/tables/TimeWindows';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {OsuUsersDao} from '../../../src/main/data/dao/OsuUsersDao';
import {SqlDbTable} from '../../../src/main/data/raw/db/SqlDbTable';

describe('OsuUsersDao', async function () {
  let tables: SqlDbTable<object, object>[];
  let dao: OsuUsersDao;
  {
    const apis = [new FakeBanchoApi()];
    const db = new SqliteDb(':memory:');
    const osuUserSnapshots = new OsuUserSnapshotsImpl(db);
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsImpl(db);
    const timeWindows = new TimeWindowsImpl(db);
    const requestsSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      appUserApiRequestsCounts,
      timeWindows
    );
    const recentApiRequests = new AppUserRecentApiRequestsDaoImpl(
      requestsSummariesDao
    );

    tables = [osuUserSnapshots];
    dao = new OsuUsersDaoImpl(apis, osuUserSnapshots, recentApiRequests);
  }

  before(async function () {
    await Promise.all(tables.map(t => t.createTable()));
  });

  describe('#getByUsername()', function () {
    it('should return undefined when user does not exist', async function () {
      const appUserId = 'fake-app-user-id';
      const result = await dao.getByUsername(
        appUserId,
        'this username should not exist',
        OsuServer.Bancho,
        OsuRuleset.osu
      );
      assert.equal(result, undefined);
    });
    it('should return OsuUser when user exists', async function () {
      const appUserId = 'fake-app-user-id';
      const username = getFakeOsuUserUsername(1);
      if (username === undefined) {
        throw Error('All osu user ids used in this test should be valid');
      }
      const result = await dao.getByUsername(
        appUserId,
        username,
        OsuServer.Bancho,
        OsuRuleset.osu
      );
      assert.notEqual(result, undefined);
    });
  });
});
