/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {ALL_OSU_SERVERS, OsuServer} from '../../../src/primitives/OsuServer';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../../src/primitives/OsuRuleset';
import {OsuUsersDaoImpl} from '../../../src/main/data/dao/OsuUsersDaoImpl';
import {FakeBanchoApi} from '../../mocks/data/raw/http/BanchoApi';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {OsuUserSnapshotsImpl} from '../../../src/main/data/raw/db/tables/OsuUserSnapshots';
import {AppUserRecentApiRequestsDaoImpl} from '../../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserApiRequestsCountsImpl} from '../../../src/main/data/raw/db/tables/AppUserApiRequestsCounts';
import {TimeWindowsImpl} from '../../../src/main/data/raw/db/tables/TimeWindows';
import {SqlDbTable} from '../../../src/main/data/raw/db/SqlDbTable';
import {getFakeOsuUserInfo} from '../../mocks/Generators';
import {SetUsernameUseCase} from '../../../src/main/domain/usecases/set_username/SetUsernameUseCase';
import {SetUsernameRequest} from '../../../src/main/domain/usecases/set_username/SetUsernameRequest';
import {AppUsersImpl} from '../../../src/main/data/raw/db/tables/AppUsers';
import {AppUsersDaoImpl} from '../../../src/main/data/dao/AppUsersDaoImpl';

describe('SetUsernameUseCase', function () {
  let tables: SqlDbTable<object, object>[];
  let usecase: SetUsernameUseCase;
  {
    const apis = [new FakeBanchoApi()];
    const db = new SqliteDb(':memory:');
    const osuUserSnapshots = new OsuUserSnapshotsImpl(db);
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsImpl(db);
    const timeWindows = new TimeWindowsImpl(db);
    const appUsers = new AppUsersImpl(db);
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
          assert.equal(result.username, undefined);
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
          assert.equal(result.username, user.username);
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
        assert.notEqual(result.username, undefined);
        assert.equal(result.mode, user.ruleset);
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
        assert.notEqual(result.username, undefined);
        assert.equal(result.mode, user.ruleset);
      }
    });
  });
});
