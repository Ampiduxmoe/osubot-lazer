/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {OsuRecentScoresDaoImpl} from '../../../src/main/data/dao/OsuRecentScoresDaoImpl';
import {FakeBanchoApi} from '../../mocks/data/raw/http/BanchoApi';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {OsuRuleset} from '../../../src/primitives/OsuRuleset';
import {OsuUserSnapshotsImpl} from '../../../src/main/data/raw/db/tables/OsuUserSnapshots';
import {AppUserApiRequestsCountsImpl} from '../../../src/main/data/raw/db/tables/AppUserApiRequestsCounts';
import {TimeWindowsImpl} from '../../../src/main/data/raw/db/tables/TimeWindows';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserRecentApiRequestsDaoImpl} from '../../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {SqlDbTable} from '../../../src/main/data/raw/db/SqlDbTable';
import {OsuRecentScoresDao} from '../../../src/main/application/requirements/dao/OsuRecentScoresDao';
import {getFakeRecentScoreInfos} from '../../mocks/Generators';
import {RecentScoreInfo} from '../../../src/main/data/raw/http/boundary/RecentScoreInfo';

describe('OsuRecentScoresDao', function () {
  let tables: SqlDbTable<object, object>[];
  let dao: OsuRecentScoresDao;
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
    tables = [osuUserSnapshots, appUserApiRequestsCounts];
    dao = new OsuRecentScoresDaoImpl(apis, osuUserSnapshots, recentApiRequests);
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
        true,
        [{acronym: 'HD', isOptional: false}],
        3,
        1,
        OsuRuleset.osu
      );
      assert.strictEqual(result.length, 0);
    });
    it('should return RecentScore[] of non-zero length when user exists and has recent scores', async function () {
      const appUserId = 'fake-app-user-id';
      const result = await dao.get(
        appUserId,
        1,
        OsuServer.Bancho,
        true,
        [{acronym: 'HD', isOptional: false}],
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
      const fakeScores = getFakeRecentScoreInfos(osuId, ruleset);
      const modAcronyms = (s: RecentScoreInfo) => s.mods.map(m => m.acronym);
      const hdDtScores = fakeScores.filter(
        s =>
          s.mods.length === 2 &&
          modAcronyms(s).includes('HD') &&
          modAcronyms(s).includes('DT')
      );
      const dtScores = fakeScores.filter(
        s => s.mods.length === 1 && modAcronyms(s).includes('DT')
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
        true,
        [
          {acronym: 'HD', isOptional: true},
          {acronym: 'DT', isOptional: false},
        ],
        10,
        1,
        ruleset
      );
      assert.notStrictEqual(result, undefined);
      assert.strictEqual(result.length, targetScoreCount);
    });
  });
});
