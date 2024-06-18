/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {ALL_OSU_SERVERS, OsuServer} from '../../../src/primitives/OsuServer';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../../src/primitives/OsuRuleset';
import {OsuUsersDaoImpl} from '../../../src/main/data/dao/OsuUsersDaoImpl';
import {FakeBanchoApi} from '../../mocks/data/http/BanchoApi';
import {SqliteDb} from '../../../src/main/data/persistence/db/SqliteDb';
import {OsuUserSnapshotsTable} from '../../../src/main/data/persistence/db/tables/OsuUserSnapshotsTable';
import {AppUserRecentApiRequestsDaoImpl} from '../../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserApiRequestsCountsTable} from '../../../src/main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {TimeWindowsTable} from '../../../src/main/data/persistence/db/tables/TimeWindowsTable';
import {SqlDbTable} from '../../../src/main/data/persistence/db/SqlDbTable';
import {getFakeOsuUserInfo} from '../../mocks/Generators';
import {SetUsernameUseCase} from '../../../src/main/application/usecases/set_username/SetUsernameUseCase';
import {SetUsernameRequest} from '../../../src/main/application/usecases/set_username/SetUsernameRequest';
import {AppUsersTable} from '../../../src/main/data/persistence/db/tables/AppUsersTable';
import {AppUsersDaoImpl} from '../../../src/main/data/dao/AppUsersDaoImpl';

describe('SetUsernameUseCase', function () {
  let tables: SqlDbTable[];
  let usecase: SetUsernameUseCase;
  {
    const apis = [new FakeBanchoApi()];
    const db = new SqliteDb(':memory:');
    const osuUserSnapshots = new OsuUserSnapshotsTable(db);
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsTable(db);
    const timeWindows = new TimeWindowsTable(db);
    const appUsers = new AppUsersTable(db);
    const appUsersDao = new AppUsersDaoImpl(appUsers);
    const requestsSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      appUserApiRequestsCounts,
      timeWindows
    );
    const recentApiRequestsDao = new AppUserRecentApiRequestsDaoImpl(
      requestsSummariesDao
    );
    const osuUsersDao = new OsuUsersDaoImpl(
      apis,
      osuUserSnapshots,
      recentApiRequestsDao
    );

    tables = [osuUserSnapshots, appUsers];
    usecase = new SetUsernameUseCase(appUsersDao, osuUsersDao);
  }

  before(async function () {
    await Promise.all(tables.map(t => t.createTable()));
  });

  const servers = ALL_OSU_SERVERS;
  const rulesets = ALL_OSU_RULESETS;
  describe('#execute()', function () {
    it('should return username as undefined when user does not exist', async function () {
      const username = 'this username should not exist';
      for (const server of servers) {
        for (const ruleset of rulesets) {
          const request: SetUsernameRequest = {
            appUserId: 'should be irrelevant',
            server: OsuServer[server],
            username: username,
            mode: OsuRuleset[ruleset],
          };
          const result = await usecase.execute(request);
          assert.strictEqual(result.username, undefined);
        }
      }
    });
    it('should return case-correct username when user exists', async function () {
      const usersThatShouldExist = [1, 3, 5, 7, 9].flatMap(n => {
        const userInfo = getFakeOsuUserInfo(n, undefined);
        if (userInfo === undefined) {
          throw Error('All osu user ids used in this test should be valid');
        }
        return userInfo;
      });
      for (const user of usersThatShouldExist) {
        const usernameVariants = [
          user.username.toLowerCase(),
          user.username.toUpperCase(),
        ];
        for (const usernameVariant of usernameVariants) {
          const request: SetUsernameRequest = {
            appUserId: 'should be irrelevant',
            server: OsuServer.Bancho,
            username: usernameVariant,
            mode: OsuRuleset.taiko,
          };
          const result = await usecase.execute(request);
          assert.strictEqual(result.username, user.username);
        }
      }
    });
    it('should return correct user preferred game mode when not specified', async function () {
      const usersThatShouldExist = [1, 3, 5, 7, 9].flatMap(n => {
        const userInfo = getFakeOsuUserInfo(n, undefined);
        if (userInfo === undefined) {
          throw Error('All osu user ids used in this test should be valid');
        }
        return servers.flatMap(server => {
          return {
            username: userInfo.username,
            server: OsuServer[server],
            ruleset: userInfo.preferredMode,
          };
        });
      });
      for (const user of usersThatShouldExist) {
        const request: SetUsernameRequest = {
          appUserId: 'should be irrelevant',
          server: OsuServer.Bancho,
          username: user.username,
          mode: undefined,
        };
        const result = await usecase.execute(request);
        assert.notStrictEqual(result.username, undefined);
        assert.strictEqual(result.mode, user.ruleset);
      }
    });
    it('should return correct game mode when it is specified', async function () {
      const usersThatShouldExist = [1, 3, 5, 7, 9].flatMap(n => {
        const userInfo = getFakeOsuUserInfo(n, undefined);
        if (userInfo === undefined) {
          throw Error('All osu user ids used in this test should be valid');
        }
        return servers.flatMap(server =>
          rulesets.map(ruleset => ({
            username: userInfo.username,
            server: OsuServer[server],
            ruleset: OsuRuleset[ruleset],
          }))
        );
      });
      for (const user of usersThatShouldExist) {
        const request: SetUsernameRequest = {
          appUserId: 'should be irrelevant',
          server: OsuServer.Bancho,
          username: user.username,
          mode: user.ruleset,
        };
        const result = await usecase.execute(request);
        assert.notStrictEqual(result.username, undefined);
        assert.strictEqual(result.mode, user.ruleset);
      }
    });
  });
});
