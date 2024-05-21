/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {SqliteDb} from '../../../../../src/main/data/raw/db/SqliteDb';
import {
  OsuIdAndUsername,
  OsuIdAndUsernameKey,
} from '../../../../../src/main/data/raw/db/entities/OsuIdAndUsername';
import {OsuIdsAndUsernamesImpl} from '../../../../../src/main/data/raw/db/tables/OsuIdsAndUsernames';
import {OsuServer} from '../../../../../src/primitives/OsuServer';
import {describeBaseTableMethods} from './GenericTableTest';

describe('OsuIdsAndUsernamesImpl', function () {
  const db = new SqliteDb(':memory:');
  const table = new OsuIdsAndUsernamesImpl(db);
  const firstEntity: OsuIdAndUsername = {
    username: 'Username',
    server: OsuServer.Bancho,
    id: 0,
  };
  const firstEntityVariant: OsuIdAndUsername = {
    username: 'Username',
    server: OsuServer.Bancho,
    id: 999,
  };
  const secondEntity: OsuIdAndUsername = {
    username: 'Username #2',
    server: OsuServer.Bancho,
    id: 1,
  };
  const thirdEntity = {
    username: 'Username #3',
    server: OsuServer.Bancho,
    id: 2,
  };
  describeBaseTableMethods({
    db: db,
    table: table,
    testEntities: {
      first: {
        value: firstEntity,
        key: firstEntity as OsuIdAndUsernameKey,
      },
      firstVariant: {
        value: firstEntityVariant,
        key: firstEntityVariant as OsuIdAndUsernameKey,
      },
      second: {
        value: secondEntity,
        key: secondEntity as OsuIdAndUsernameKey,
      },
      third: {
        value: thirdEntity,
        key: thirdEntity as OsuIdAndUsernameKey,
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
      const row = await table.get(thirdEntity as OsuIdAndUsernameKey);
      assert.equal(row, undefined);
    });
    it('expired entity should be deleted from table after calling #get()', async function () {
      const row = await db.get<unknown>(
        `SELECT * from ${table.tableName} WHERE id = ?`,
        [thirdEntity.id]
      );
      assert.equal(row, undefined);
    });
  });
});
