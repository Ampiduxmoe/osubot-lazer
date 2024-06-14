/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {ALL_OSU_SERVERS, OsuServer} from '../../../src/primitives/OsuServer';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../../src/primitives/OsuRuleset';
import {OsuUsersDaoImpl} from '../../../src/main/data/dao/OsuUsersDaoImpl';
import {FakeBanchoApi} from '../../mocks/data/raw/http/BanchoApi';
import {SqliteDb} from '../../../src/main/data/persistence/db/SqliteDb';
import {OsuUserSnapshotsImpl} from '../../../src/main/data/persistence/db/tables/OsuUserSnapshots';
import {AppUserRecentApiRequestsDaoImpl} from '../../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserApiRequestsCountsImpl} from '../../../src/main/data/persistence/db/tables/AppUserApiRequestsCounts';
import {TimeWindowsImpl} from '../../../src/main/data/persistence/db/tables/TimeWindows';
import {SqlDbTable} from '../../../src/main/data/persistence/db/SqlDbTable';
import {GetRecentPlaysUseCase} from '../../../src/main/application/usecases/get_recent_plays/GetRecentPlaysUseCase';
import {OsuRecentScoresDaoImpl} from '../../../src/main/data/dao/OsuRecentScoresDaoImpl';
import {FakeScoreSimulationApi} from '../../mocks/data/raw/http/ScoreSimulationApi';
import {ScoreSimulationsDaoImpl} from '../../../src/main/data/dao/ScoreSimulationsDaoImpl';
import {CachedOsuUsersDaoImpl} from '../../../src/main/data/dao/CachedOsuUsersDaoImpl';
import {GetRecentPlaysRequest} from '../../../src/main/application/usecases/get_recent_plays/GetRecentPlaysRequest';
import {getFakeOsuUserInfo} from '../../mocks/Generators';

describe('GetRecentPlaysUseCase', function () {
  let tables: SqlDbTable<object, object>[];
  let usecase: GetRecentPlaysUseCase;
  {
    const apis = [new FakeBanchoApi()];
    const scoreSimApi = new FakeScoreSimulationApi();
    const db = new SqliteDb(':memory:');
    const osuUserSnapshots = new OsuUserSnapshotsImpl(db);
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
      osuUserSnapshots,
      recentApiRequestsDao
    );
    const cachedOsuUsersDao = new CachedOsuUsersDaoImpl(osuUserSnapshots);
    const scoreSimulationsDao = new ScoreSimulationsDaoImpl(scoreSimApi);
    const recentScoresDao = new OsuRecentScoresDaoImpl(
      apis,
      osuUserSnapshots,
      recentApiRequestsDao
    );

    tables = [osuUserSnapshots, appUserApiRequestsCounts, timeWindows];
    usecase = new GetRecentPlaysUseCase(
      recentScoresDao,
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
    it('should return OsuUserRecentPlays as undefined when user does not exist', async function () {
      const username = 'this username should not exist';
      for (const server of servers) {
        for (const ruleset of rulesets) {
          const request: GetRecentPlaysRequest = {
            appUserId: 'should be irrelevant',
            server: OsuServer[server],
            username: username,
            ruleset: OsuRuleset[ruleset],
            includeFails: true,
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
          assert.strictEqual(result.recentPlays, undefined);
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
        const request: GetRecentPlaysRequest = {
          appUserId: 'should be irrelevant',
          server: user.server,
          username: user.username,
          ruleset: undefined,
          includeFails: true,
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
        assert.notStrictEqual(result.recentPlays, undefined);
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
        const request: GetRecentPlaysRequest = {
          appUserId: 'should be irrelevant',
          server: user.server,
          username: user.username,
          ruleset: user.ruleset,
          includeFails: true,
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
        assert.notStrictEqual(result.recentPlays, undefined);
        assert.strictEqual(result.ruleset, user.ruleset);
      }
    });
  });
});
