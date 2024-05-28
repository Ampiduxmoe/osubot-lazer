/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {GetOsuUserInfoUseCase} from '../../../src/main/domain/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {GetOsuUserInfoRequest} from '../../../src/main/domain/usecases/get_osu_user_info/GetOsuUserInfoRequest';
import {ALL_OSU_SERVERS, OsuServer} from '../../../src/primitives/OsuServer';
import {getFakeOsuUserUsername} from '../../mocks/Generators';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../../src/primitives/OsuRuleset';
import {OsuUsersDaoImpl} from '../../../src/main/data/dao/OsuUsersDaoImpl';
import {FakeBanchoApi} from '../../mocks/data/raw/http/BanchoApi';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {OsuIdsAndUsernamesImpl} from '../../../src/main/data/raw/db/tables/OsuIdsAndUsernames';
import {AppUserRecentApiRequestsDaoImpl} from '../../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserApiRequestsCountsImpl} from '../../../src/main/data/raw/db/tables/AppUserApiRequestsCounts';
import {TimeWindowsImpl} from '../../../src/main/data/raw/db/tables/TimeWindows';
import {SqlDbTable} from '../../../src/main/data/raw/db/SqlDbTable';

describe('GetOsuUserInfoUseCase', function () {
  let tables: SqlDbTable<object, object>[];
  let usecase: GetOsuUserInfoUseCase;
  {
    const apis = [new FakeBanchoApi()];
    const db = new SqliteDb(':memory:');
    const idsAndUsernames = new OsuIdsAndUsernamesImpl(db);
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsImpl(db);
    const timeWindows = new TimeWindowsImpl(db);
    const requestsSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      appUserApiRequestsCounts,
      timeWindows
    );
    const recentApiRequestsDao = new AppUserRecentApiRequestsDaoImpl(
      requestsSummariesDao
    );
    const osuUsersDao = new OsuUsersDaoImpl(
      apis,
      idsAndUsernames,
      recentApiRequestsDao
    );

    tables = [idsAndUsernames, appUserApiRequestsCounts, timeWindows];
    usecase = new GetOsuUserInfoUseCase(osuUsersDao);
  }

  before(async function () {
    await Promise.all(tables.map(t => t.createTable()));
  });

  const servers = ALL_OSU_SERVERS;
  const rulesets = ALL_OSU_RULESETS;
  describe('#execute()', function () {
    it('should return OsuUserInfo as undefined when user does not exist', async function () {
      const username = 'this username should not exist';
      for (const server of servers) {
        for (const ruleset of rulesets) {
          const request: GetOsuUserInfoRequest = {
            appUserId: 'should be irrelevant',
            server: OsuServer[server],
            username: username,
            ruleset: OsuRuleset[ruleset],
          };
          const result = await usecase.execute(request);
          assert.equal(result.userInfo, undefined);
        }
      }
    });
    it('should return correct OsuUserInfo when user exists', async function () {
      const usersThatShouldExist = [1, 2, 3].flatMap(n => {
        const username = getFakeOsuUserUsername(n);
        if (username === undefined) {
          throw Error('All osu user ids used in this test should be valid');
        }
        return servers.flatMap(server =>
          rulesets.map(ruleset => ({
            username: username,
            server: OsuServer[server],
            ruleset: OsuRuleset[ruleset],
          }))
        );
      });
      for (const user of usersThatShouldExist) {
        const request: GetOsuUserInfoRequest = {
          appUserId: 'should be irrelevant',
          server: OsuServer.Bancho,
          username: user.username,
          ruleset: user.ruleset,
        };
        const result = await usecase.execute(request);
        assert.equal(result.userInfo?.username, user.username);
      }
    });
    it('should ignore username string case', async function () {
      const originalUsername = getFakeOsuUserUsername(1);
      if (originalUsername === undefined) {
        throw Error('All osu user ids used in this test should be valid');
      }
      const usernameVariants = [
        originalUsername,
        originalUsername.toLowerCase(),
        originalUsername.toUpperCase(),
      ];
      for (const usernameVariant of usernameVariants) {
        const request: GetOsuUserInfoRequest = {
          appUserId: 'should be irrelevant',
          server: OsuServer.Bancho,
          username: usernameVariant,
          ruleset: OsuRuleset.osu,
        };
        const result = await usecase.execute(request);
        assert.equal(result.userInfo?.username, originalUsername);
      }
    });
  });
});
