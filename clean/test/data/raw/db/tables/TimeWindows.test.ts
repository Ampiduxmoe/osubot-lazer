/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {SqliteDb} from '../../../../../src/main/data/raw/db/SqliteDb';
import {
  TimeWindow,
  TimeWindowKey,
} from '../../../../../src/main/data/raw/db/entities/TimeWindow';
import {
  TimeWindows,
  TimeWindowsImpl,
} from '../../../../../src/main/data/raw/db/tables/TimeWindows';
import {
  assertTwoTestEntitiesAreEqual,
  describeBaseTableMethods,
} from './GenericTableTest';

describe('TimeWindows', function () {
  const db = new SqliteDb(':memory:');
  const table: TimeWindows = new TimeWindowsImpl(db);
  const firstEntity: TimeWindow = {
    id: 1,
    start_time: 0,
    end_time: 9,
  };
  const firstEntityUpdated: TimeWindow = {
    id: 1,
    start_time: 10,
    end_time: 19,
  };
  const secondEntity: TimeWindow = {
    id: 2,
    start_time: 20,
    end_time: 29,
  };
  const thirdEntity: TimeWindow = {
    id: 3,
    start_time: 30,
    end_time: 39,
  };
  describeBaseTableMethods({
    db: db,
    table: table,
    testEntities: [
      {
        value: firstEntity,
        key: firstEntity as TimeWindowKey,
      },
      {
        value: secondEntity,
        key: secondEntity as TimeWindowKey,
      },
      {
        value: thirdEntity,
        key: thirdEntity as TimeWindowKey,
      },
    ],
    options: {
      entityToUpdate: {
        index: 0,
        updateValue: firstEntityUpdated,
      },
      entityToDelete: {
        index: 1,
        deletionKey: secondEntity as TimeWindowKey,
      },
    },
  });
  describe('table-specific operations', async function () {
    it('should correctly add one row through #addWithoutId()', async function () {
      await table.addWithoutId({
        id: -1,
        start_time: -10,
        end_time: -1,
      });
      const row = await table.get({id: 4});
      assert.notStrictEqual(row, undefined);
    });
    it('#getAllByIds() should correctly return multiple rows', async function () {
      const rows = await table.getAllByIds([1, 3]);
      assert.strictEqual(rows.length, 2);
      for (const referenceEntity of [firstEntityUpdated, thirdEntity]) {
        const entityMatch = rows.find(
          x =>
            x.start_time === referenceEntity.start_time &&
            x.end_time === referenceEntity.end_time
        );
        assert.notStrictEqual(entityMatch, undefined);
        const referenceId =
          referenceEntity.start_time === firstEntityUpdated.start_time ? 1 : 3;
        assertTwoTestEntitiesAreEqual({
          firstObject: {
            value: entityMatch!,
            key: entityMatch! as TimeWindowKey,
          },
          secondObject: {
            value: referenceEntity,
            key: {id: referenceId},
          },
          idFields: ['id'],
        });
      }
    });
    const newIds = [5, 6, 7, 8, 9];
    const newTimeWindows = newIds.map(n => ({
      id: -1,
      start_time: n * 10,
      end_time: n * 10 + 9,
    }));
    it('should correctly add multiple rows on #addAllWithoutIds() call', async function () {
      await table.addAllWithoutIds(newTimeWindows);
      const rows = await table.getAllByIds(newIds);
      assert.strictEqual(rows.length, newIds.length);
    });
    it('should correctly return multiple rows when using #getAllByTimeInterval()', async function () {
      const startTime = 5 * 10 + 5;
      const endTime = 9 * 10 + 5;
      const rows = await table.getAllByTimeInterval(startTime, endTime);
      assert.strictEqual(rows.length, 3);
      const referenceIds = [6, 7, 8];
      const referenceEntities = referenceIds.map(
        refId => newTimeWindows[newIds.indexOf(refId)]
      );
      for (const referenceEntity of referenceEntities) {
        const referenceEntityId =
          referenceIds[referenceEntities.indexOf(referenceEntity)];
        const entityMatch = rows.find(x => x.id === referenceEntityId);
        assert.notStrictEqual(entityMatch, undefined);
        assertTwoTestEntitiesAreEqual({
          firstObject: {
            value: entityMatch!,
            key: entityMatch! as TimeWindowKey,
          },
          secondObject: {
            value: referenceEntity,
            key: {id: referenceEntityId},
          },
          idFields: ['id'],
        });
      }
    });
    it('#deleteAll() should correctly delete multiple rows', async function () {
      const timeWindowsToDelete = [5, 7, 9].map(n => ({id: n}));
      await table.deleteAll(timeWindowsToDelete);
      const rows = await table.getAllByIds(newIds);
      assert.strictEqual(
        rows.length,
        newIds.length - timeWindowsToDelete.length
      );
      for (const deletedWindow of timeWindowsToDelete) {
        assert.strictEqual(
          rows.find(x => x.id === deletedWindow.id),
          undefined
        );
      }
    });
  });
});
