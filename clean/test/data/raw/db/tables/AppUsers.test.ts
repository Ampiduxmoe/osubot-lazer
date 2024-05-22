/* eslint-disable prefer-arrow-callback */
import {SqliteDb} from '../../../../../src/main/data/raw/db/SqliteDb';
import {AppUsersImpl} from '../../../../../src/main/data/raw/db/tables/AppUsers';
import {
  AppUser,
  AppUserKey,
} from '../../../../../src/main/data/raw/db/entities/AppUser';
import {OsuRuleset} from '../../../../../src/primitives/OsuRuleset';
import {OsuServer} from '../../../../../src/primitives/OsuServer';
import {describeBaseTableMethods} from './GenericTableTest';

describe('AppUsersImpl', function () {
  const db = new SqliteDb(':memory:');
  const table = new AppUsersImpl(db);
  const firstEntity: AppUser = {
    id: 'Some app id',
    server: OsuServer.Bancho,
    osu_id: 0,
    username: 'Username',
    ruleset: OsuRuleset.osu,
  };
  const firstEntityUpdated: AppUser = {
    id: firstEntity.id,
    server: firstEntity.server,
    osu_id: 999,
    username: 'updated username',
    ruleset: OsuRuleset.taiko,
  };
  const secondEntity: AppUser = {
    id: 'Some app id #2',
    server: OsuServer.Bancho,
    osu_id: 1,
    username: 'Username #2',
    ruleset: OsuRuleset.taiko,
  };
  const thirdEntity: AppUser = {
    id: 'Some app id #3',
    server: OsuServer.Bancho,
    osu_id: 2,
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
