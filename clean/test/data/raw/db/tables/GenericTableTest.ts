/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {SqlDb} from '../../../../../src/main/data/raw/db/SqlDb';
import {SqlDbTable} from '../../../../../src/main/data/raw/db/SqlDbTable';

type TestEntity<TEntity, TEntityKey> = {
  value: TEntity;
  key: TEntityKey;
};

export function describeBaseTableMethods<
  TEntity extends object,
  TEntityKey,
>(params: {
  db: SqlDb;
  table: SqlDbTable<TEntity, TEntityKey>;
  testEntities: {
    first: TestEntity<TEntity, TEntityKey>;
    firstVariant: TestEntity<TEntity, TEntityKey>;
    second: TestEntity<TEntity, TEntityKey>;
    third: TestEntity<TEntity, TEntityKey>;
  };
}) {
  const {db, table} = params;
  const {
    first: firstEntity,
    firstVariant: firstEntityVariant,
    second: secondEntity,
    third: thirdEntity,
  } = params.testEntities;
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
    it('should be one row after one entity is added through #add()', async function () {
      await table.add(firstEntity.value);
      assert.equal(await getRowCount(), 1);
    });
    it('#get() should correctly return added entity', async function () {
      const row = await table.get(firstEntity.key);
      if (row === undefined) {
        throw Error('Error getting database object');
      }
      const entityKeys = Object.keys(firstEntity.value) as (keyof TEntity)[];
      for (const key of entityKeys) {
        assert.equal(row[key], firstEntity.value[key]);
      }
    });
    it('should be three rows after two more entities are added', async function () {
      await table.add(secondEntity.value);
      await table.add(thirdEntity.value);
      assert.equal(await getRowCount(), 3);
    });
    it('#update() should correctly update first entity', async function () {
      await table.update(firstEntityVariant.value);
      const updatedRow = await table.get(firstEntity.key);
      if (updatedRow === undefined) {
        throw Error('Error getting database object');
      }
      const entityKeys = Object.keys(firstEntity.value) as (keyof TEntity)[];
      for (const key of entityKeys) {
        assert.equal(updatedRow[key], firstEntityVariant.value[key]);
      }
    });
    it('#delete() should correctly delete second entity', async function () {
      await table.delete(secondEntity.value);
      const row = await table.get(secondEntity.key);
      assert.equal(row, undefined);
    });
    it('should be two rows in the end', async function () {
      assert.equal(await getRowCount(), 2);
    });
  });
}
