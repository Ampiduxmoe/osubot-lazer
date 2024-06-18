/* eslint-disable prefer-arrow-callback */
import {SqliteDb} from '../../../../../src/main/data/persistence/db/SqliteDb';
import {JsonObjectsTable} from '../../../../../src/main/data/persistence/db/tables/JsonObjectsTable';
import {
  JsonObject,
  JsonObjectKey,
} from '../../../../../src/main/data/repository/models/JsonObject';
import {describeBaseTableMethods} from './GenericTableTest';
import {JsonCacheDescriptor} from '../../../../../src/primitives/JsonCacheDescriptor';
import assert from 'assert';

describe('JsonObjectsTable', function () {
  const db = new SqliteDb(':memory:');
  const table = new JsonObjectsTable(db);
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
  const firstCacheDescriptor: JsonCacheDescriptor<object> = {
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
  const secondCacheDescriptor: JsonCacheDescriptor<object> = {
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
  const thirdCacheDescriptor: JsonCacheDescriptor<{one: number; two: number}> =
    {
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
  const firstEntity: JsonObject = {
    jsonKey: firstCacheDescriptor.key,
    jsonString: firstCacheDescriptor.serialize(firstJsObject),
  };
  const firstEntityUpdated: JsonObject = {
    jsonKey: firstCacheDescriptor.key,
    jsonString: firstCacheDescriptor.serialize(firstJsObjectUpdated),
  };
  const secondEntity: JsonObject = {
    jsonKey: secondCacheDescriptor.key,
    jsonString: secondCacheDescriptor.serialize(secondJsObject),
  };
  const thirdEntity: JsonObject = {
    jsonKey: thirdCacheDescriptor.key,
    jsonString: thirdCacheDescriptor.serialize(thirdJsObject),
  };
  describeBaseTableMethods({
    db: db,
    table: table,
    testEntities: [
      {
        value: firstEntity,
        key: firstEntity as JsonObjectKey,
      },
      {
        value: secondEntity,
        key: secondEntity as JsonObjectKey,
      },
      {
        value: thirdEntity,
        key: thirdEntity as JsonObjectKey,
      },
    ],
    options: {
      entityToUpdate: {
        index: 0,
        updateValue: firstEntityUpdated,
      },
      entityToDelete: {
        index: 1,
        deletionKey: secondEntity as JsonObjectKey,
      },
    },
  });
  describe('table-specific operations', async function () {
    it('should return undefined when deserialization fails on #validateAndGet()', async function () {
      await table.validateAndGet({
        key: firstCacheDescriptor.key,
        serialize: () => '',
        deserialize: () => undefined,
      });
      const row = await table.get(firstEntity);
      assert.strictEqual(row, undefined);
    });
    it('should return correct object when deserialization succeeds on #validateAndGet()', async function () {
      const obj = await table.validateAndGet(thirdCacheDescriptor);
      assert.deepStrictEqual(obj, thirdJsObject);
    });
    it('#save() should add row when object key does not exist', async function () {
      await table.save(firstJsObject, firstCacheDescriptor);
      const row = await table.get(firstEntity);
      assert.strictEqual(row?.jsonString, firstEntity.jsonString);
    });
    it('#save() should update row when object key exists', async function () {
      await table.save(firstJsObjectUpdated, firstCacheDescriptor);
      const row = await table.get(firstEntityUpdated);
      assert.strictEqual(row?.jsonString, firstEntityUpdated.jsonString);
    });
  });
});
