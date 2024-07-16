/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {OsuUserRecentScoresDaoImpl} from '../../../main/data/dao/OsuUserRecentScoresDaoImpl';
import {FakeBanchoApi} from '../../mocks/data/http/BanchoApi';
import {SqliteDb} from '../../../main/data/persistence/db/SqliteDb';
import {OsuServer} from '../../../main/primitives/OsuServer';
import {OsuRuleset} from '../../../main/primitives/OsuRuleset';
import {OsuUserSnapshotsTable} from '../../../main/data/persistence/db/tables/OsuUserSnapshotsTable';
import {AppUserApiRequestsCountsTable} from '../../../main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {TimeWindowsTable} from '../../../main/data/persistence/db/tables/TimeWindowsTable';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserRecentApiRequestsDaoImpl} from '../../../main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {SqlDbTable} from '../../../main/data/persistence/db/SqlDbTable';
import {OsuUserRecentScoresDao} from '../../../main/application/requirements/dao/OsuUserRecentScoresDao';
import {getFakeRecentScoreInfos} from '../../mocks/Generators';
import {OsuUserRecentScoreInfo} from '../../../main/data/http/boundary/OsuUserRecentScoreInfo';
import {ModAcronym} from '../../../main/primitives/ModAcronym';

describe('OsuUserRecentScoresDao', function () {
  let tables: SqlDbTable[];
  let dao: OsuUserRecentScoresDao;
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
    dao = new OsuUserRecentScoresDaoImpl(
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
        true,
        [{acronym: new ModAcronym('HD'), isOptional: false}],
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
        [{acronym: new ModAcronym('HD'), isOptional: false}],
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
      const modAcronyms = (s: OsuUserRecentScoreInfo) =>
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
        true,
        [
          {acronym: new ModAcronym('HD'), isOptional: true},
          {acronym: new ModAcronym('DT'), isOptional: false},
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
