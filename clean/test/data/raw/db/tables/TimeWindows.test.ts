/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {SqliteDb} from '../../../../../src/main/data/raw/db/SqliteDb';
import {
  TimeWindow,
  TimeWindowKey,
} from '../../../../../src/main/data/raw/db/entities/TimeWindow';
import {TimeWindowsImpl} from '../../../../../src/main/data/raw/db/tables/TimeWindows';
import {
  assertTwoTestEntitiesAreEqual,
  describeBaseTableMethods,
} from './GenericTableTest';

describe('TimeWindowsImpl', function () {
  const db = new SqliteDb(':memory:');
  const table = new TimeWindowsImpl(db);
  const firstEntity: TimeWindow = {
    id: -1,
    start_time: 10,
    end_time: 19,
  };
  const firstEntityUpdated: TimeWindow = {
    id: 1,
    start_time: 20,
    end_time: 29,
  };
  const secondEntity: TimeWindow = {
    id: -1,
    start_time: 30,
    end_time: 39,
  };
  const thirdEntity: TimeWindow = {
    id: -1,
    start_time: 40,
    end_time: 49,
  };
  describeBaseTableMethods({
    db: db,
    table: table,
    testEntities: [
      {
        value: firstEntity,
        key: {id: 1},
      },
      {
        value: secondEntity,
        key: {id: 2},
      },
      {
        value: thirdEntity,
        key: {id: 3},
      },
    ],
    options: {
      updateEntity: {
        index: 0,
        updateValue: firstEntityUpdated,
      },
      entityToDelete: {
        index: 1,
        deletionKey: {id: 2},
      },
    },
  });
  describe('table-specific operations', async function () {
    it('should correctly return multiple rows on #getAllByIds() call', async function () {
      const rows = await table.getAllByIds([1, 3]);
      assert.equal(rows.length, 2);
      for (const referenceEntity of [firstEntityUpdated, thirdEntity]) {
        const entityMatch = rows.find(
          x =>
            x.start_time === referenceEntity.start_time &&
            x.end_time === referenceEntity.end_time
        );
        assert.notEqual(entityMatch, undefined);
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
    const newIds = [4, 5, 6, 7, 8];
    const newTimeWindows = newIds.map(n => ({
      id: -1,
      start_time: n * 10,
      end_time: n * 10 + 9,
    }));
    it('should correctly add multiple rows on #addAll() call', async function () {
      await table.addAll(newTimeWindows);
      const rows = await table.getAllByIds(newIds);
      assert.equal(rows.length, newIds.length);
    });
    it('should correctly return multiple rows on #getAllByTimeInterval() call', async function () {
      const startTime = 4 * 10 + 5;
      const endTime = 8 * 10 + 5;
      const rows = await table.getAllByTimeInterval(startTime, endTime);
      assert.equal(rows.length, 3);
      const referenceIds = [5, 6, 7];
      const referenceEntities = referenceIds.map(
        refId => newTimeWindows[newIds.indexOf(refId)]
      );
      for (const referenceEntity of referenceEntities) {
        const referenceEntityId =
          referenceIds[referenceEntities.indexOf(referenceEntity)];
        const entityMatch = rows.find(x => x.id === referenceEntityId);
        assert.notEqual(entityMatch, undefined);
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
    it('should correctly delete multiple rows on #deleteAll() call', async function () {
      const timeWindowsToDelete = [4, 6, 8].map(n => ({id: n}));
      await table.deleteAll(timeWindowsToDelete);
      const rows = await table.getAllByIds(newIds);
      assert.equal(rows.length, newIds.length - timeWindowsToDelete.length);
      for (const deletedWindow of timeWindowsToDelete) {
        assert.equal(
          rows.find(x => x.id === deletedWindow.id),
          undefined
        );
      }
    });
  });
});
