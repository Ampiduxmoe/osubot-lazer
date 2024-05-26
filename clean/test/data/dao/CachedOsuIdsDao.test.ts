/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {CachedOsuIdsDaoImpl} from '../../../src/main/data/dao/CachedOsuIdsDaoImpl';
import {FakeOsuIdsAndUsernames} from '../../mocks/data/raw/db/tables/OsuIdsAndUsernames';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {getFakeOsuUserUsername} from '../../mocks/Generators';
import {OsuServer} from '../../../src/primitives/OsuServer';

describe('CachedOsuIdsDaoImpl', function () {
  const db = new SqliteDb(':memory:');
  const idsAndUsernames = new FakeOsuIdsAndUsernames(db);
  const dao = new CachedOsuIdsDaoImpl(idsAndUsernames);
  describe('#get()', function () {
    it('should return undefined when id has not been added for the username yet', async function () {
      const result = await dao.get(
        getFakeOsuUserUsername(NaN),
        OsuServer.Bancho
      );
      assert.equal(result, undefined);
    });
    it('should return CachedOsuId when corresponding entry exists in a table', async function () {
      const id = 1;
      const username = getFakeOsuUserUsername(id);
      await idsAndUsernames.add({
        username: username,
        server: OsuServer.Bancho,
        id: id,
      });
      const result = await dao.get(username, OsuServer.Bancho);
      assert.notEqual(result, undefined);
    });
  });
});
