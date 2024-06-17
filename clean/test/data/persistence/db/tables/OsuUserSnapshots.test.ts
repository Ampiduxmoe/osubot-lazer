/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {SqliteDb} from '../../../../../src/main/data/persistence/db/SqliteDb';
import {
  OsuUserSnapshot,
  OsuUserSnapshotKey,
} from '../../../../../src/main/data/persistence/db/entities/OsuUserSnapshot';
import {
  OsuUserSnapshots,
  OsuUserSnapshotsImpl,
} from '../../../../../src/main/data/persistence/db/tables/OsuUserSnapshots';
import {OsuServer} from '../../../../../src/primitives/OsuServer';
import {describeBaseTableMethods} from './GenericTableTest';
import {OsuRuleset} from '../../../../../src/primitives/OsuRuleset';

describe('OsuUserSnapshots', function () {
  const db = new SqliteDb(':memory:');
  const table: OsuUserSnapshots = new OsuUserSnapshotsImpl(db);
  const firstEntity: OsuUserSnapshot = {
    username: 'Username',
    server: OsuServer.Bancho,
    id: 0,
    preferred_mode: OsuRuleset.mania,
  };
  const firstEntityUpdated: OsuUserSnapshot = {
    username: firstEntity.username,
    server: firstEntity.server,
    id: 999,
    preferred_mode: OsuRuleset.osu,
  };
  const secondEntity: OsuUserSnapshot = {
    username: 'Username #2',
    server: OsuServer.Bancho,
    id: 1,
    preferred_mode: OsuRuleset.taiko,
  };
  const thirdEntity: OsuUserSnapshot = {
    username: 'Username #3',
    server: OsuServer.Bancho,
    id: 2,
    preferred_mode: OsuRuleset.ctb,
  };
  describeBaseTableMethods({
    db: db,
    table: table,
    testEntities: [
      {
        value: firstEntity,
        key: firstEntity as OsuUserSnapshotKey,
      },
      {
        value: secondEntity,
        key: secondEntity as OsuUserSnapshotKey,
      },
      {
        value: thirdEntity,
        key: thirdEntity as OsuUserSnapshotKey,
      },
    ],
    options: {
      entityToUpdate: {
        index: 0,
        updateValue: firstEntityUpdated,
      },
      entityToDelete: {
        index: 1,
        deletionKey: secondEntity as OsuUserSnapshotKey,
      },
    },
  });
  describe('table-specific operations', async function () {
    it('should return undefined when accessing expired entity through #get()', async function () {
      const now = Date.now();
      await db.run(
        `UPDATE ${table.tableName} SET expires_at = ? WHERE id = ?`,
        [now, thirdEntity.id]
      );
      const row = await table.get(thirdEntity as OsuUserSnapshotKey);
      assert.strictEqual(row, undefined);
    });
    it('expired entity should be deleted from table after calling #get()', async function () {
      const row = await db.get<unknown>(
        `SELECT * from ${table.tableName} WHERE id = ?`,
        [thirdEntity.id]
      );
      assert.strictEqual(row, undefined);
    });
  });
});
