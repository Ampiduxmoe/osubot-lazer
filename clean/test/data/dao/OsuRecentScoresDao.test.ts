/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {OsuRecentScoresDaoImpl} from '../../../src/main/data/dao/OsuRecentScoresDaoImpl';
import {FakeOsuIdsAndUsernames} from '../../mocks/data/raw/db/tables/OsuIdsAndUsernames';
import {FakeBanchoApi} from '../../mocks/data/raw/http/BanchoApi';
import {FakeAppUserRecentApiRequestsDao} from '../../mocks/data/dao/AppUserRecentApiRequestsDao';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {OsuRuleset} from '../../../src/primitives/OsuRuleset';

describe('OsuRecentScoresDaoImpl', function () {
  const apis = [new FakeBanchoApi()];
  const db = new SqliteDb(':memory:');
  const idsAndUsernames = new FakeOsuIdsAndUsernames(db);
  const recentApiRequests = new FakeAppUserRecentApiRequestsDao();
  const dao = new OsuRecentScoresDaoImpl(
    apis,
    idsAndUsernames,
    recentApiRequests
  );
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
      assert.equal(result.length, 0);
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
      assert.notEqual(result, undefined);
      assert.notEqual(result.length, 0);
    });
  });
});
