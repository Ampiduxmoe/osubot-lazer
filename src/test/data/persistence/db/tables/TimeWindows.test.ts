/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {SqliteDb} from '../../../../../main/data/persistence/db/SqliteDb';
import {
  TimeWindow,
  TimeWindowKey,
} from '../../../../../main/data/repository/models/TimeWindow';
import {TimeWindowsTable} from '../../../../../main/data/persistence/db/tables/TimeWindowsTable';
import {
  assertTwoTestEntitiesAreEqual,
  describeBaseTableMethods,
} from './GenericTableTest';

describe('TimeWindowsTable', function () {
  const db = new SqliteDb(':memory:');
  const table = new TimeWindowsTable(db);
  const firstEntity: TimeWindow = {
    id: 1,
    startTime: 0,
    endTime: 9,
  };
  const firstEntityUpdated: TimeWindow = {
    id: 1,
    startTime: 10,
    endTime: 19,
  };
  const secondEntity: TimeWindow = {
    id: 2,
    startTime: 20,
    endTime: 29,
  };
  const thirdEntity: TimeWindow = {
    id: 3,
    startTime: 30,
    endTime: 39,
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
        startTime: -10,
        endTime: -1,
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
            x.startTime === referenceEntity.startTime &&
            x.endTime === referenceEntity.endTime
        );
        assert.notStrictEqual(entityMatch, undefined);
        const referenceId =
          referenceEntity.startTime === firstEntityUpdated.startTime ? 1 : 3;
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
    const newTimeWindows: TimeWindow[] = newIds.map(n => ({
      id: -1,
      startTime: n * 10,
      endTime: n * 10 + 9,
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
