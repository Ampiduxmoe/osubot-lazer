/* eslint-disable prefer-arrow-callback */
import {SqliteDb} from '../../../../../src/main/data/persistence/db/SqliteDb';
import {AppUsersTable} from '../../../../../src/main/data/persistence/db/tables/AppUsersTable';
import {
  AppUser,
  AppUserKey,
} from '../../../../../src/main/data/repository/models/AppUser';
import {OsuRuleset} from '../../../../../src/primitives/OsuRuleset';
import {OsuServer} from '../../../../../src/primitives/OsuServer';
import {describeBaseTableMethods} from './GenericTableTest';

describe('AppUsersTable', function () {
  const db = new SqliteDb(':memory:');
  const table = new AppUsersTable(db);
  const firstEntity: AppUser = {
    id: 'Some app id',
    server: OsuServer.Bancho,
    osuId: 0,
    username: 'Username',
    ruleset: OsuRuleset.osu,
  };
  const firstEntityUpdated: AppUser = {
    id: firstEntity.id,
    server: firstEntity.server,
    osuId: 999,
    username: 'updated username',
    ruleset: OsuRuleset.taiko,
  };
  const secondEntity: AppUser = {
    id: 'Some app id #2',
    server: OsuServer.Bancho,
    osuId: 1,
    username: 'Username #2',
    ruleset: OsuRuleset.taiko,
  };
  const thirdEntity: AppUser = {
    id: 'Some app id #3',
    server: OsuServer.Bancho,
    osuId: 2,
    username: 'Username #3',
    ruleset: OsuRuleset.ctb,
  };
  describeBaseTableMethods({
    db: db,
    table: table,
    testEntities: [
      {
        value: firstEntity,
        key: firstEntity as AppUserKey,
      },
      {
        value: secondEntity,
        key: secondEntity as AppUserKey,
      },
      {
        value: thirdEntity,
        key: thirdEntity as AppUserKey,
      },
    ],
    options: {
      entityToUpdate: {
        index: 0,
        updateValue: firstEntityUpdated,
      },
      entityToDelete: {
        index: 1,
        deletionKey: secondEntity as AppUserKey,
      },
    },
  });
});
