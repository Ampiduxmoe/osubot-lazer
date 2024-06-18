/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {OsuUsersDaoImpl} from '../../../src/main/data/dao/OsuUsersDaoImpl';
import {FakeBanchoApi} from '../../mocks/data/http/BanchoApi';
import {SqliteDb} from '../../../src/main/data/persistence/db/SqliteDb';
import {getFakeOsuUserUsername} from '../../mocks/Generators';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {OsuRuleset} from '../../../src/primitives/OsuRuleset';
import {OsuUserSnapshotsTable} from '../../../src/main/data/persistence/db/tables/OsuUserSnapshotsTable';
import {AppUserRecentApiRequestsDaoImpl} from '../../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUserApiRequestsCountsTable} from '../../../src/main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {TimeWindowsTable} from '../../../src/main/data/persistence/db/tables/TimeWindowsTable';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {OsuUsersDao} from '../../../src/main/application/requirements/dao/OsuUsersDao';
import {SqlDbTable} from '../../../src/main/data/persistence/db/SqlDbTable';

describe('OsuUsersDao', async function () {
  let tables: SqlDbTable[];
  let dao: OsuUsersDao;
  {
    const apis = [new FakeBanchoApi()];
    const db = new SqliteDb(':memory:');
    const osuUserSnapshots = new OsuUserSnapshotsTable(db);
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsTable(db);
    const timeWindows = new TimeWindowsTable(db);
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
      assert.strictEqual(result, undefined);
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
      assert.notStrictEqual(result, undefined);
    });
  });
});
