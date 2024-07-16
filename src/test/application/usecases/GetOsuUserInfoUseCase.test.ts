/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {GetOsuUserInfoUseCase} from '../../../main/application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {GetOsuUserInfoRequest} from '../../../main/application/usecases/get_osu_user_info/GetOsuUserInfoRequest';
import {ALL_OSU_SERVERS, OsuServer} from '../../../main/primitives/OsuServer';
import {getFakeOsuUserUsername} from '../../mocks/Generators';
import {
  ALL_OSU_RULESETS,
  OsuRuleset,
} from '../../../main/primitives/OsuRuleset';
import {OsuUsersDaoImpl} from '../../../main/data/dao/OsuUsersDaoImpl';
import {FakeBanchoApi} from '../../mocks/data/http/BanchoApi';
import {SqliteDb} from '../../../main/data/persistence/db/SqliteDb';
import {OsuUserSnapshotsTable} from '../../../main/data/persistence/db/tables/OsuUserSnapshotsTable';
import {AppUserRecentApiRequestsDaoImpl} from '../../../main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserApiRequestsCountsTable} from '../../../main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {TimeWindowsTable} from '../../../main/data/persistence/db/tables/TimeWindowsTable';
import {SqlDbTable} from '../../../main/data/persistence/db/SqlDbTable';

describe('GetOsuUserInfoUseCase', function () {
  let tables: SqlDbTable[];
  let usecase: GetOsuUserInfoUseCase;
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
    const recentApiRequestsDao = new AppUserRecentApiRequestsDaoImpl(
      requestsSummariesDao
    );
    const osuUsersDao = new OsuUsersDaoImpl(
      apis,
      osuUserSnapshots,
      recentApiRequestsDao
    );

    tables = [osuUserSnapshots, appUserApiRequestsCounts, timeWindows];
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
          assert.strictEqual(result.userInfo, undefined);
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
        assert.strictEqual(result.userInfo?.username, user.username);
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
        assert.strictEqual(result.userInfo?.username, originalUsername);
      }
    });
  });
});
