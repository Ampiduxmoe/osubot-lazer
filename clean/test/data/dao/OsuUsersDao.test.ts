/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {OsuUsersDaoImpl} from '../../../src/main/data/dao/OsuUsersDaoImpl';
import {FakeOsuIdsAndUsernames} from '../../mocks/data/raw/db/tables/OsuIdsAndUsernames';
import {FakeBanchoApi} from '../../mocks/data/raw/http/BanchoApi';
import {FakeAppUserRecentApiRequestsDao} from '../../mocks/data/dao/AppUserRecentApiRequestsDao';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {getFakeOsuUserUsername} from '../../mocks/Generators';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {OsuRuleset} from '../../../src/primitives/OsuRuleset';

describe('OsuUsersDaoImpl', function () {
  const apis = [new FakeBanchoApi()];
  const db = new SqliteDb(':memory:');
  const idsAndUsernames = new FakeOsuIdsAndUsernames(db);
  const recentApiRequests = new FakeAppUserRecentApiRequestsDao();
  const dao = new OsuUsersDaoImpl(apis, idsAndUsernames, recentApiRequests);
  describe('#get()', function () {
    it('should return undefined when user does not exist', async function () {
      const appUserId = 'fake-app-user-id';
      const result = await dao.getByUsername(
        appUserId,
        getFakeOsuUserUsername(NaN),
        OsuServer.Bancho,
        OsuRuleset.osu
      );
      assert.equal(result, undefined);
    });
    it('should return OsuUser when user exists', async function () {
      const appUserId = 'fake-app-user-id';
      const result = await dao.getByUsername(
        appUserId,
        getFakeOsuUserUsername(1),
        OsuServer.Bancho,
        OsuRuleset.osu
      );
      assert.notEqual(result, undefined);
    });
  });
});
