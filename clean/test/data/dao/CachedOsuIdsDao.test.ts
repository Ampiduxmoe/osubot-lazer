/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {CachedOsuIdsDaoImpl} from '../../../src/main/data/dao/CachedOsuIdsDaoImpl';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {getFakeOsuUserUsername} from '../../mocks/Generators';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {OsuIdsAndUsernamesImpl} from '../../../src/main/data/raw/db/tables/OsuIdsAndUsernames';
import {CachedOsuIdsDao} from '../../../src/main/data/dao/CachedOsuIdsDao';
import {OsuIdAndUsername} from '../../../src/main/data/raw/db/entities/OsuIdAndUsername';

describe('CachedOsuIdsDao', function () {
  const db = new SqliteDb(':memory:');
  const idsAndUsernames = new OsuIdsAndUsernamesImpl(db);
  const dao: CachedOsuIdsDao = new CachedOsuIdsDaoImpl(idsAndUsernames);

  const exampleIdAndUsername: OsuIdAndUsername = {
    username:
      getFakeOsuUserUsername(123) ??
      (() => {
        throw Error('All osu user ids used in this test should be valid');
      })(),
    server: OsuServer.Bancho,
    id: 123,
  };

  before(async function () {
    await idsAndUsernames.createTable();
    await idsAndUsernames.add(exampleIdAndUsername);
  });

  describe('#get()', function () {
    it('should return undefined when id has not been added for the username yet', async function () {
      const result = await dao.get(
        'this username should not exist',
        OsuServer.Bancho
      );
      assert.equal(result, undefined);
    });
    it('should return CachedOsuId when corresponding entry exists', async function () {
      const result = await dao.get(
        exampleIdAndUsername.username,
        OsuServer.Bancho
      );
      assert.notEqual(result, undefined);
    });
  });
});
