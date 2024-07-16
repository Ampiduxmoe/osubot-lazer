/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {SqlDb} from '../../../../../main/data/persistence/db/SqlDb';
import {SqlDbTable} from '../../../../../main/data/persistence/db/SqlDbTable';
import {Repository} from '../../../../../main/data/repository/Repository';

type TestEntity<TEntityKey extends object, TEntity extends TEntityKey> = {
  value: TEntity;
  key: TEntityKey;
};

export function describeBaseTableMethods<
  TEntityKey extends object,
  TEntity extends TEntityKey,
>(params: {
  db: SqlDb;
  table: SqlDbTable & Repository<TEntityKey, TEntity>;
  testEntities: TestEntity<TEntityKey, TEntity>[];
  options: {
    entityToUpdate: {
      index: number;
      updateValue: TEntity;
    };
    entityToDelete: {
      index: number;
      deletionKey: TEntityKey;
    };
  };
}) {
  const {db, table, testEntities, options} = params;
  if (testEntities.length < 3) {
    throw Error('At leas 3 entities are required for successfull test');
  }
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
      assert.strictEqual(await thisTableExists(), false);
      await table.createTable();
      assert.strictEqual(await thisTableExists(), true);
    });
  });
  describe('basic operations', function () {
    const getRowCount: () => Promise<number> = async () => {
      return (await db.getAll<unknown>(`SELECT * FROM ${table.tableName}`, []))
        .length;
    };
    it('should be zero rows when table is empty', async function () {
      assert.strictEqual(await getRowCount(), 0);
    });
    it('should be one row after one entity is added through #add()', async function () {
      await table.add(testEntities[0].value);
      assert.strictEqual(await getRowCount(), 1);
    });
    it('#get() should correctly return added entity', async function () {
      const row = await table.get(testEntities[0].key);
      assert.notStrictEqual(row, undefined);
      assertTwoTestEntitiesAreEqual({
        firstObject: {
          value: row!,
          key: row! as TEntityKey,
        },
        secondObject: {
          value: testEntities[0].value,
          key: testEntities[0].key,
        },
        idFields: Object.keys(testEntities[0].key) as (keyof TEntityKey)[],
      });
    });
    const maxEntityCount = testEntities.length;
    const entitiesToAdd = maxEntityCount - 1;
    it(`should be ${maxEntityCount} rows after ${entitiesToAdd} more entities are added`, async function () {
      for (let i = 1; i < maxEntityCount; i++) {
        await table.add(testEntities[i].value);
      }
      assert.strictEqual(await getRowCount(), maxEntityCount);
    });
    const updateIndex = options.entityToUpdate.index;
    it(`#update() should correctly update entity[${updateIndex}]`, async function () {
      const updateValue = options.entityToUpdate.updateValue;
      await table.update(updateValue);
      const updatedRow = await table.get(testEntities[updateIndex].key);
      assert.notStrictEqual(updatedRow, undefined);
      assertTwoTestEntitiesAreEqual({
        firstObject: {
          value: updatedRow!,
          key: updatedRow! as TEntityKey,
        },
        secondObject: {
          value: updateValue,
          key: updateValue as TEntityKey,
        },
        idFields: Object.keys(updateValue) as (keyof TEntityKey)[],
      });
    });
    const deletionIndex = options.entityToDelete.index;
    it(`#delete() should correctly delete entity[${deletionIndex}]`, async function () {
      const deletionKey = options.entityToDelete.deletionKey;
      await table.delete(deletionKey);
      const row = await table.get(testEntities[deletionIndex].key);
      assert.strictEqual(row, undefined);
    });
    const finalEntityCountGoal = maxEntityCount - 1;
    it(`should be ${finalEntityCountGoal} rows in the end`, async function () {
      assert.strictEqual(await getRowCount(), finalEntityCountGoal);
    });
  });
}

function assertTestEntitiesEquality<
  TKey extends object,
  T extends TKey,
>(params: {
  firstObject: TestEntity<TKey, T>;
  secondObject: TestEntity<TKey, T>;
  idFields: (keyof TKey)[];
  skipIdFields: boolean;
  skipNonIdFields: boolean;
}) {
  if (params.skipIdFields && params.skipNonIdFields) {
    return;
  }
  const {firstObject, secondObject, idFields} = params;
  const entityFields = Object.keys(firstObject.value).filter(
    k => k in secondObject.value
  ) as (keyof T)[];
  for (const field of entityFields) {
    if ((idFields as (keyof T)[]).includes(field)) {
      if (params.skipIdFields) {
        continue;
      }
      const keyField = field as keyof TKey;
      assert.strictEqual(firstObject.key[keyField], secondObject.key[keyField]);
      continue;
    }
    if (params.skipNonIdFields) {
      continue;
    }
    assert.strictEqual(firstObject.value[field], secondObject.value[field]);
  }
}

export function assertTwoTestEntitiesAreEqual<
  TKey extends object,
  T extends TKey,
>(params: {
  firstObject: TestEntity<TKey, T>;
  secondObject: TestEntity<TKey, T>;
  idFields: (keyof TKey)[];
}) {
  assertTestEntitiesEquality({
    firstObject: params.firstObject,
    secondObject: params.secondObject,
    idFields: params.idFields,
    skipIdFields: false,
    skipNonIdFields: false,
  });
}
