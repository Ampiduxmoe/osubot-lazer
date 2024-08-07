/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {SqliteDb} from '../../../../../main/data/persistence/db/SqliteDb';
import {
  OsuUserSnapshot,
  OsuUserSnapshotKey,
} from '../../../../../main/data/repository/models/OsuUserSnapshot';
import {OsuUserSnapshotsTable} from '../../../../../main/data/persistence/db/tables/OsuUserSnapshotsTable';
import {OsuServer} from '../../../../../main/primitives/OsuServer';
import {describeBaseTableMethods} from './GenericTableTest';
import {OsuRuleset} from '../../../../../main/primitives/OsuRuleset';

describe('OsuUserSnapshotsTable', function () {
  const db = new SqliteDb(':memory:');
  const table = new OsuUserSnapshotsTable(db);
  const firstEntity: OsuUserSnapshot = {
    username: 'Username',
    server: OsuServer.Bancho,
    id: 0,
    preferredMode: OsuRuleset.mania,
  };
  const firstEntityUpdated: OsuUserSnapshot = {
    username: firstEntity.username,
    server: firstEntity.server,
    id: 999,
    preferredMode: OsuRuleset.osu,
  };
  const secondEntity: OsuUserSnapshot = {
    username: 'Username #2',
    server: OsuServer.Bancho,
    id: 1,
    preferredMode: OsuRuleset.taiko,
  };
  const thirdEntity: OsuUserSnapshot = {
    username: 'Username #3',
    server: OsuServer.Bancho,
    id: 2,
    preferredMode: OsuRuleset.ctb,
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
