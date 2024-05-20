/* eslint-disable prefer-arrow-callback */
import assert = require('assert');
import {SqliteDb} from '../../../../../src/main/data/raw/db/SqliteDb';
import {AppUsers} from '../../../../../src/main/data/raw/db/tables/AppUsers';
import {
  AppUser,
  AppUserKey,
} from '../../../../../src/main/data/raw/db/entities/AppUser';
import {OsuRuleset} from '../../../../../src/primitives/OsuRuleset';
import {OsuServer} from '../../../../../src/primitives/OsuServer';

describe('AppUsers', function () {
  const db = new SqliteDb(':memory:');
  const table = new AppUsers(db);
  describe('#createTable()', function () {
    it('should successfully create a table ', async function () {
      const thisTableExists: () => Promise<boolean> = async () => {
        return (
          (await db.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            [table.tableName]
          )) !== undefined
        );
      };
      assert.equal(await thisTableExists(), false);
      await table.createTable();
      assert.equal(await thisTableExists(), true);
    });
  });
  describe('table operations', function () {
    const getRowCount: () => Promise<number> = async () => {
      return (await db.getAll<unknown>(`SELECT * FROM ${table.tableName}`, []))
        .length;
    };
    it('should be zero rows when table is empty', async function () {
      assert.equal(await getRowCount(), 0);
    });
    const firstEntry: AppUser = {
      id: 'Some app id',
      server: OsuServer.Bancho,
      osu_id: 0,
      username: 'Username',
      ruleset: OsuRuleset.osu,
    };
    it('should be one row after one entry is added through #add()', async function () {
      await table.add(firstEntry);
      assert.equal(await getRowCount(), 1);
    });
    it('#get() should correctly return added entry', async function () {
      const row = await table.get(firstEntry as AppUserKey);
      if (row === undefined) {
        throw Error('Error getting database object');
      }
      const entityKeys = Object.keys(firstEntry) as (keyof AppUser)[];
      for (const key of entityKeys) {
        assert.equal(row[key], firstEntry[key]);
      }
    });
    const secondEntry: AppUser = {
      id: 'Some app id #2',
      server: OsuServer.Bancho,
      osu_id: 1,
      username: 'Username #2',
      ruleset: OsuRuleset.taiko,
    };
    it('should be three rows after two more entries are added', async function () {
      await table.add(secondEntry);
      await table.add({
        id: 'Some app id #3',
        server: OsuServer.Bancho,
        osu_id: 2,
        username: 'Username #3',
        ruleset: OsuRuleset.ctb,
      });
      assert.equal(await getRowCount(), 3);
    });
    it('#update() should correctly update first entry', async function () {
      const entityKey = firstEntry as AppUserKey;
      const newEntityInfo: AppUser = {
        id: entityKey.id,
        server: entityKey.server,
        osu_id: 999,
        username: 'updated username',
        ruleset: OsuRuleset.taiko,
      };
      await table.update(newEntityInfo);
      const updatedRow = await table.get(entityKey);
      if (updatedRow === undefined) {
        throw Error('Error getting database object');
      }
      const entityKeys = Object.keys(firstEntry) as (keyof AppUser)[];
      for (const key of entityKeys) {
        assert.equal(updatedRow[key], newEntityInfo[key]);
      }
    });
    it('#delete() should correctly delete second entry', async function () {
      await table.delete(secondEntry);
      const row = await table.get(secondEntry as AppUserKey);
      assert.equal(row, undefined);
    });
    it('should be two rows in the end', async function () {
      assert.equal(await getRowCount(), 2);
    });
  });
});
