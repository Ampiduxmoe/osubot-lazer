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
import {FakeScoreSimulationApi} from '../../mocks/data/http/ScoreSimulationApi';
import {ScoreSimulationsDaoImpl} from '../../../src/main/data/dao/ScoreSimulationsDaoImpl';
import {CachedOsuUsersDaoImpl} from '../../../src/main/data/dao/CachedOsuUsersDaoImpl';
import {getFakeOsuUserInfo} from '../../mocks/Generators';
import {GetUserBestPlaysUseCase} from '../../../src/main/application/usecases/get_user_best_plays/GetUserBestPlaysUseCase';
import {OsuUserBestScoresDaoImpl} from '../../../src/main/data/dao/OsuUserBestScoresDaoImpl';
import {GetUserBestPlaysRequest} from '../../../src/main/application/usecases/get_user_best_plays/GetUserBestPlaysRequest';

describe('GetUserBestPlaysUseCase', function () {
  let tables: SqlDbTable[];
  let usecase: GetUserBestPlaysUseCase;
  {
    const apis = [new FakeBanchoApi()];
    const scoreSimApi = new FakeScoreSimulationApi();
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
    const cachedOsuUsersDao = new CachedOsuUsersDaoImpl(osuUserSnapshots);
    const scoreSimulationsDao = new ScoreSimulationsDaoImpl(scoreSimApi);
    const userBestScoresDao = new OsuUserBestScoresDaoImpl(
      apis,
      osuUserSnapshots,
      recentApiRequestsDao
    );

    tables = [osuUserSnapshots, appUserApiRequestsCounts, timeWindows];
    usecase = new GetUserBestPlaysUseCase(
      userBestScoresDao,
      scoreSimulationsDao,
      cachedOsuUsersDao,
      osuUsersDao
    );
  }

  before(async function () {
    await Promise.all(tables.map(t => t.createTable()));
  });

  const servers = ALL_OSU_SERVERS;
  const rulesets = ALL_OSU_RULESETS;
  describe('#execute()', function () {
    it('should return OsuUserBestPlays as undefined when user does not exist', async function () {
      const username = 'this username should not exist';
      for (const server of servers) {
        for (const ruleset of rulesets) {
          const request: GetUserBestPlaysRequest = {
            appUserId: 'should be irrelevant',
            server: OsuServer[server],
            username: username,
            ruleset: OsuRuleset[ruleset],
            startPosition: 1,
            quantity: 1,
            mods: [
              {
                acronym: 'HD',
                isOptional: true,
              },
            ],
          };
          const result = await usecase.execute(request);
          assert.strictEqual(result.bestPlays, undefined);
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
        const request: GetUserBestPlaysRequest = {
          appUserId: 'should be irrelevant',
          server: user.server,
          username: user.username,
          ruleset: undefined,
          startPosition: 1,
          quantity: 10,
          mods: [
            {
              acronym: 'HD',
              isOptional: true,
            },
          ],
        };
        const result = await usecase.execute(request);
        assert.notStrictEqual(result.bestPlays, undefined);
        assert.strictEqual(result.ruleset, user.ruleset);
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
        const request: GetUserBestPlaysRequest = {
          appUserId: 'should be irrelevant',
          server: user.server,
          username: user.username,
          ruleset: user.ruleset,
          startPosition: 1,
          quantity: 10,
          mods: [
            {
              acronym: 'HD',
              isOptional: true,
            },
          ],
        };
        const result = await usecase.execute(request);
        assert.notStrictEqual(result.bestPlays, undefined);
        assert.strictEqual(result.ruleset, user.ruleset);
      }
    });
  });
});
