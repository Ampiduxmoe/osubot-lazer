/* eslint-disable prefer-arrow-callback */
import {SqliteDb} from '../../../../../src/main/data/raw/db/SqliteDb';
import {
  AppUserApiRequestsCounts,
  AppUserApiRequestsCountsImpl,
} from '../../../../../src/main/data/raw/db/tables/AppUserApiRequestsCounts';
import {
  assertTwoTestEntitiesAreEqual,
  describeBaseTableMethods,
} from './GenericTableTest';
import {
  AppUserApiRequestsCount,
  AppUserApiRequestsCountKey,
} from '../../../../../src/main/data/raw/db/entities/AppUserApiRequestsCount';
import assert from 'assert';

describe('AppUserApiRequestsCounts', function () {
  const db = new SqliteDb(':memory:');
  const table: AppUserApiRequestsCounts = new AppUserApiRequestsCountsImpl(db);
  const firstEntity: AppUserApiRequestsCount = {
    time_window_id: 1,
    app_user_id: 'appUserId1',
    target: 'target1',
    subtarget: 'subtarget1',
    count: 0,
  };
  const firstEntityUpdated: AppUserApiRequestsCount = {
    time_window_id: firstEntity.time_window_id,
    app_user_id: firstEntity.app_user_id,
    target: firstEntity.target,
    subtarget: firstEntity.subtarget,
    count: 10,
  };
  const secondEntity: AppUserApiRequestsCount = {
    time_window_id: 1,
    app_user_id: 'appUserId2',
    target: 'target1',
    subtarget: 'subtarget2',
    count: 20,
  };
  const thirdEntity: AppUserApiRequestsCount = {
    time_window_id: 3,
    app_user_id: 'appUserId1',
    target: 'target2',
    subtarget: 'subtarget1',
    count: 30,
  };
  const fourthEntity: AppUserApiRequestsCount = {
    time_window_id: 4,
    app_user_id: 'appUserId1',
    target: 'target2',
    subtarget: 'subtarget1',
    count: 40,
  };
  const fifthEntity: AppUserApiRequestsCount = {
    time_window_id: 4,
    app_user_id: 'appUserId2',
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
        assert.notEqual(entityMatch, undefined);
        assertTwoTestEntitiesAreEqual({
          firstObject: {
            value: entityMatch!,
            key: entityMatch! as AppUserApiRequestsCountKey,
          },
          secondObject: {
            value: referenceEntity,
            key: referenceEntity as AppUserApiRequestsCountKey,
          },
          idFields: ['time_window_id', 'app_user_id', 'target', 'subtarget'],
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
        assert.notEqual(entityMatch, undefined);
        assertTwoTestEntitiesAreEqual({
          firstObject: {
            value: entityMatch!,
            key: entityMatch! as AppUserApiRequestsCountKey,
          },
          secondObject: {
            value: referenceEntity,
            key: referenceEntity as AppUserApiRequestsCountKey,
          },
          idFields: ['time_window_id', 'app_user_id', 'target', 'subtarget'],
        });
      }
    });
  });
});
