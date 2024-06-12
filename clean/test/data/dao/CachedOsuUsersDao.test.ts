/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {CachedOsuUsersDaoImpl} from '../../../src/main/data/dao/CachedOsuUsersDaoImpl';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {getFakeOsuUserUsername} from '../../mocks/Generators';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {OsuUserSnapshotsImpl} from '../../../src/main/data/raw/db/tables/OsuUserSnapshots';
import {CachedOsuUsersDao} from '../../../src/main/application/requirements/dao/CachedOsuUsersDao';
import {OsuUserSnapshot} from '../../../src/main/data/raw/db/entities/OsuUserSnapshot';
import {OsuRuleset} from '../../../src/primitives/OsuRuleset';

describe('CachedOsuUsersDao', function () {
  const db = new SqliteDb(':memory:');
  const osuUserSnapshots = new OsuUserSnapshotsImpl(db);
  const dao: CachedOsuUsersDao = new CachedOsuUsersDaoImpl(osuUserSnapshots);

  const exampleUserSnapshot: OsuUserSnapshot = {
    username:
      getFakeOsuUserUsername(123) ??
      (() => {
        throw Error('All osu user ids used in this test should be valid');
      })(),
    server: OsuServer.Bancho,
    id: 123,
    preferred_mode: OsuRuleset.mania,
  };

  before(async function () {
    await osuUserSnapshots.createTable();
    await osuUserSnapshots.add(exampleUserSnapshot);
  });

  describe('#get()', function () {
    it('should return undefined when id has not been added for the username yet', async function () {
      const result = await dao.get(
        'this username should not exist',
        OsuServer.Bancho
      );
      assert.strictEqual(result, undefined);
    });
    it('should return CachedOsuUser when corresponding entry exists', async function () {
      const result = await dao.get(
        exampleUserSnapshot.username,
        exampleUserSnapshot.server
      );
      assert.notStrictEqual(result, undefined);
    });
  });
});
