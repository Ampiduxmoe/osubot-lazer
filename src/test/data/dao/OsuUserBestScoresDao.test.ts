/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {OsuUserBestScoresDao} from '../../../main/application/requirements/dao/OsuUserBestScoresDao';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserRecentApiRequestsDaoImpl} from '../../../main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {OsuUserBestScoresDaoImpl} from '../../../main/data/dao/OsuUserBestScoresDaoImpl';
import {OsuUserBestScoreInfo} from '../../../main/data/http/boundary/OsuUserBestScoreInfo';
import {SqlDbTable} from '../../../main/data/persistence/db/SqlDbTable';
import {SqliteDb} from '../../../main/data/persistence/db/SqliteDb';
import {AppUserApiRequestsCountsTable} from '../../../main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {OsuUserSnapshotsTable} from '../../../main/data/persistence/db/tables/OsuUserSnapshotsTable';
import {TimeWindowsTable} from '../../../main/data/persistence/db/tables/TimeWindowsTable';
import {ModAcronym} from '../../../main/primitives/ModAcronym';
import {ModCombinationPattern} from '../../../main/primitives/ModCombinationPattern';
import {ModPatternCollection} from '../../../main/primitives/ModPatternCollection';
import {OsuRuleset} from '../../../main/primitives/OsuRuleset';
import {OsuServer} from '../../../main/primitives/OsuServer';
import {FakeBanchoApi} from '../../mocks/data/http/BanchoApi';
import {getFakeUserBestScoreInfos} from '../../mocks/Generators';

describe('OsuUserBestScoresDao', function () {
  let tables: SqlDbTable[];
  let dao: OsuUserBestScoresDao;
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
    tables = [osuUserSnapshots, appUserApiRequestsCounts];
    dao = new OsuUserBestScoresDaoImpl(
      apis,
      osuUserSnapshots,
      recentApiRequests
    );
  }

  before(async function () {
    await Promise.all(tables.map(t => t.createTable()));
  });

  describe('#get()', function () {
    it('should return empty array when user does not exist', async function () {
      const appUserId = 'fake-app-user-id';
      const result = await dao.get(
        appUserId,
        NaN,
        OsuServer.Bancho,
        new ModPatternCollection(
          new ModCombinationPattern({
            mods: [new ModAcronym('HD')],
            type: 'required',
          })
        ),
        3,
        1,
        OsuRuleset.osu
      );
      assert.strictEqual(result.length, 0);
    });
    it('should return UserBestScore[] of non-zero length when user exists and has best scores', async function () {
      const appUserId = 'fake-app-user-id';
      const result = await dao.get(
        appUserId,
        1,
        OsuServer.Bancho,
        new ModPatternCollection(
          new ModCombinationPattern({
            mods: [new ModAcronym('HD')],
            type: 'required',
          })
        ),
        3,
        1,
        OsuRuleset.osu
      );
      assert.notStrictEqual(result, undefined);
      assert.notStrictEqual(result.length, 0);
    });
    it('should correctly filter scores based on mod list', async function () {
      const osuId = 1;
      const ruleset = OsuRuleset.osu;
      const fakeScores = getFakeUserBestScoreInfos(osuId, ruleset);
      const modAcronyms = (s: OsuUserBestScoreInfo) =>
        s.mods.map(m => m.acronym);
      const hdDtScores = fakeScores.filter(
        s =>
          s.mods.length === 2 &&
          ModAcronym.listContains('HD', modAcronyms(s)) &&
          ModAcronym.listContains('DT', modAcronyms(s))
      );
      const dtScores = fakeScores.filter(
        s => s.mods.length === 1 && modAcronyms(s)[0].is('DT')
      );
      if (hdDtScores.length === 0 || dtScores.length === 0) {
        throw Error('Fake scores should include popular mod combinations');
      }
      const targetScoreCount = hdDtScores.length + dtScores.length;
      const appUserId = 'fake-app-user-id';
      const result = await dao.get(
        appUserId,
        osuId,
        OsuServer.Bancho,
        new ModPatternCollection(
          new ModCombinationPattern(
            {mods: [new ModAcronym('HD')], type: 'optional'},
            {mods: [new ModAcronym('DT')], type: 'required'}
          )
        ),
        10,
        1,
        ruleset
      );
      assert.notStrictEqual(result, undefined);
      assert.strictEqual(result.length, targetScoreCount);
    });
  });
});
