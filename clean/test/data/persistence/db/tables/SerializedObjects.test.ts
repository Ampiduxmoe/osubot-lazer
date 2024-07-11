/* eslint-disable prefer-arrow-callback */
import {SqliteDb} from '../../../../../src/main/data/persistence/db/SqliteDb';
import {SerializedObjectsTable} from '../../../../../src/main/data/persistence/db/tables/SerializedObjectsTable';
import {
  SerializedObject,
  SerializedObjectKey,
} from '../../../../../src/main/data/repository/models/SerializedObject';
import {describeBaseTableMethods} from './GenericTableTest';
import {SerializationDescriptor} from '../../../../../src/primitives/SerializationDescriptor';
import assert from 'assert';

describe('SerializedObjectsTable', function () {
  const db = new SqliteDb(':memory:');
  const table = new SerializedObjectsTable(db);
  const firstJsObject = {
    lorem: 'ipsum',
    ipsum: 0,
    dolor: {
      sit: [1, 'amet'],
    },
  };
  const firstJsObjectUpdated = {
    lorem: 'ipsum',
    ipsum: 1,
    dolor: {
      sit: [2, 'amet'],
    },
  };
  const firstDescriptor: SerializationDescriptor<object> = {
    key: 'first key',
    serialize: o => {
      return JSON.stringify(o);
    },
    deserialize: s => {
      return JSON.parse(s);
    },
  };
  const secondJsObject = {
    two: 2,
    three: 3,
  };
  const secondDescriptor: SerializationDescriptor<object> = {
    key: 'second-key',
    serialize: o => {
      return JSON.stringify(o);
    },
    deserialize: s => {
      return JSON.parse(s);
    },
  };
  const thirdJsObject = {
    one: 1,
    two: 2,
  };
  const thirdDescriptor: SerializationDescriptor<{
    one: number;
    two: number;
  }> = {
    key: 'third_key',
    serialize: o => {
      return `${o.one} ${o.two}`;
    },
    deserialize: s => {
      const tokens = s.split(' ');
      return {
        one: Number(tokens[0]),
        two: Number(tokens[1]),
      };
    },
  };
  const firstEntity: SerializedObject = {
    key: firstDescriptor.key,
    data: firstDescriptor.serialize(firstJsObject),
  };
  const firstEntityUpdated: SerializedObject = {
    key: firstDescriptor.key,
    data: firstDescriptor.serialize(firstJsObjectUpdated),
  };
  const secondEntity: SerializedObject = {
    key: secondDescriptor.key,
    data: secondDescriptor.serialize(secondJsObject),
  };
  const thirdEntity: SerializedObject = {
    key: thirdDescriptor.key,
    data: thirdDescriptor.serialize(thirdJsObject),
  };
  describeBaseTableMethods({
    db: db,
    table: table,
    testEntities: [
      {
        value: firstEntity,
        key: firstEntity as SerializedObjectKey,
      },
      {
        value: secondEntity,
        key: secondEntity as SerializedObjectKey,
      },
      {
        value: thirdEntity,
        key: thirdEntity as SerializedObjectKey,
      },
    ],
    options: {
      entityToUpdate: {
        index: 0,
        updateValue: firstEntityUpdated,
      },
      entityToDelete: {
        index: 1,
        deletionKey: secondEntity as SerializedObjectKey,
      },
    },
  });
  describe('table-specific operations', async function () {
    it('should return undefined when deserialization fails on #validateAndGet()', async function () {
      await table.validateAndGet({
        key: firstDescriptor.key,
        serialize: () => '',
        deserialize: () => undefined,
      });
      const row = await table.get(firstEntity);
      assert.strictEqual(row, undefined);
    });
    it('should return correct object when deserialization succeeds on #validateAndGet()', async function () {
      const obj = await table.validateAndGet(thirdDescriptor);
      assert.deepStrictEqual(obj, thirdJsObject);
    });
    it('#save() should add row when object key does not exist', async function () {
      await table.save(firstJsObject, firstDescriptor);
      const row = await table.get(firstEntity);
      assert.strictEqual(row?.key, firstEntity.key);
    });
    it('#save() should update row when object key exists', async function () {
      await table.save(firstJsObjectUpdated, firstDescriptor);
      const row = await table.get(firstEntityUpdated);
      assert.strictEqual(row?.key, firstEntityUpdated.key);
    });
  });
});
