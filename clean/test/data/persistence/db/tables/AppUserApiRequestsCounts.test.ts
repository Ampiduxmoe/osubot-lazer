/* eslint-disable prefer-arrow-callback */
import {SqliteDb} from '../../../../../src/main/data/persistence/db/SqliteDb';
import {AppUserApiRequestsCountsTable} from '../../../../../src/main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {
  assertTwoTestEntitiesAreEqual,
  describeBaseTableMethods,
} from './GenericTableTest';
import {
  AppUserApiRequestsCount,
  AppUserApiRequestsCountKey,
} from '../../../../../src/main/data/repository/models/AppUserApiRequestsCount';
import assert from 'assert';

describe('AppUserApiRequestsCountsTable', function () {
  const db = new SqliteDb(':memory:');
  const table = new AppUserApiRequestsCountsTable(db);
  const firstEntity: AppUserApiRequestsCount = {
    timeWindowId: 1,
    appUserId: 'appUserId1',
    target: 'target1',
    subtarget: 'subtarget1',
    count: 0,
  };
  const firstEntityUpdated: AppUserApiRequestsCount = {
    timeWindowId: firstEntity.timeWindowId,
    appUserId: firstEntity.appUserId,
    target: firstEntity.target,
    subtarget: firstEntity.subtarget,
    count: 10,
  };
  const secondEntity: AppUserApiRequestsCount = {
    timeWindowId: 1,
    appUserId: 'appUserId2',
    target: 'target1',
    subtarget: 'subtarget2',
    count: 20,
  };
  const thirdEntity: AppUserApiRequestsCount = {
    timeWindowId: 3,
    appUserId: 'appUserId1',
    target: 'target2',
    subtarget: 'subtarget1',
    count: 30,
  };
  const fourthEntity: AppUserApiRequestsCount = {
    timeWindowId: 4,
    appUserId: 'appUserId1',
    target: 'target2',
    subtarget: 'subtarget1',
    count: 40,
  };
  const fifthEntity: AppUserApiRequestsCount = {
    timeWindowId: 4,
    appUserId: 'appUserId2',
    target: 'target1',
    subtarget: 'subtarget1',
    count: 50,
  };
  describeBaseTableMethods({
    db: db,
    table: table,
    testEntities: [
      {
        value: firstEntity,
        key: firstEntity as AppUserApiRequestsCountKey,
      },
      {
        value: secondEntity,
        key: secondEntity as AppUserApiRequestsCountKey,
      },
      {
        value: thirdEntity,
        key: thirdEntity as AppUserApiRequestsCountKey,
      },
      {
        value: fourthEntity,
        key: fourthEntity as AppUserApiRequestsCountKey,
      },
      {
        value: fifthEntity,
        key: fifthEntity as AppUserApiRequestsCountKey,
      },
    ],
    options: {
      entityToUpdate: {
        index: 0,
        updateValue: firstEntityUpdated,
      },
      entityToDelete: {
        index: 1,
        deletionKey: secondEntity as AppUserApiRequestsCountKey,
      },
    },
  });
  describe('table-specific operations', async function () {
    it('#getAllByTimeWindows() should correctly return multiple rows', async function () {
      const rows = await table.getAllByTimeWindows([1, 4]);
      const referenceEntities = [firstEntityUpdated, fourthEntity, fifthEntity];
      for (const referenceEntity of referenceEntities) {
        const entityMatch = rows.find(x => x.count === referenceEntity.count);
        assert.notStrictEqual(entityMatch, undefined);
        assertTwoTestEntitiesAreEqual({
          firstObject: {
            value: entityMatch!,
            key: entityMatch! as AppUserApiRequestsCountKey,
          },
          secondObject: {
            value: referenceEntity,
            key: referenceEntity as AppUserApiRequestsCountKey,
          },
          idFields: ['timeWindowId', 'appUserId', 'target', 'subtarget'],
        });
      }
    });
    it('#getAllByAppUserAndTimeWindows should correctly return multiple rows', async function () {
      const rows = await table.getAllByAppUserAndTimeWindows(
        'appUserId1',
        [1, 4]
      );
      const referenceEntities = [firstEntityUpdated, fourthEntity];
      for (const referenceEntity of referenceEntities) {
        const entityMatch = rows.find(x => x.count === referenceEntity.count);
        assert.notStrictEqual(entityMatch, undefined);
        assertTwoTestEntitiesAreEqual({
          firstObject: {
            value: entityMatch!,
            key: entityMatch! as AppUserApiRequestsCountKey,
          },
          secondObject: {
            value: referenceEntity,
            key: referenceEntity as AppUserApiRequestsCountKey,
          },
          idFields: ['timeWindowId', 'appUserId', 'target', 'subtarget'],
        });
      }
    });
  });
});
