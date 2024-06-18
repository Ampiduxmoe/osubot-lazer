/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {AppUsersDaoImpl} from '../../../src/main/data/dao/AppUsersDaoImpl';
import {SqliteDb} from '../../../src/main/data/persistence/db/SqliteDb';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {OsuRuleset} from '../../../src/primitives/OsuRuleset';
import {AppUsersTable} from '../../../src/main/data/persistence/db/tables/AppUsersTable';
import {AppUser} from '../../../src/main/data/repository/models/AppUser';
import {
  AppUserInfo,
  AppUsersDao,
} from '../../../src/main/application/requirements/dao/AppUsersDao';

describe('AppUsersDao', function () {
  const db = new SqliteDb(':memory:');
  const appUsers = new AppUsersTable(db);
  const dao: AppUsersDao = new AppUsersDaoImpl(appUsers);

  const exampleAppUser: AppUser = {
    id: 'exampleId',
    server: OsuServer.Bancho,
    osuId: 123,
    username: 'exampleUsername',
    ruleset: OsuRuleset.osu,
  };

  before(async function () {
    await appUsers.createTable();
    await appUsers.add(exampleAppUser);
  });

  describe('#get()', function () {
    it('should return undefined when there is no entry that matches provided app user id and osu server', async function () {
      const result = await dao.get('fake-app-user-id', OsuServer.Bancho);
      assert.strictEqual(result, undefined);
    });
    it('should return CachedOsuId when corresponding entry exists', async function () {
      const result = await dao.get(exampleAppUser.id, exampleAppUser.server);
      assert.notStrictEqual(result, undefined);
    });
  });
  describe('#addOrUpdate()', function () {
    it('should update existing entry if it exists', async function () {
      const newReferenceAppUser: AppUserInfo = {
        id: exampleAppUser.id,
        server: exampleAppUser.server,
        osuId: 999,
        username: 'changed username',
        ruleset: OsuRuleset.taiko,
      };
      await dao.addOrUpdate(newReferenceAppUser);
      const result = await dao.get(exampleAppUser.id, exampleAppUser.server);
      assert.notStrictEqual(result, undefined);
      assert.strictEqual(result!.osuId, newReferenceAppUser.osuId);
      assert.strictEqual(result!.username, newReferenceAppUser.username);
      assert.strictEqual(result!.ruleset, newReferenceAppUser.ruleset);
    });
    it('should add entry if it does not exist', async function () {
      const referenceAppUser: AppUserInfo = {
        id: 'some new id',
        server: OsuServer.Bancho,
        osuId: 1,
        username: 'user username',
        ruleset: OsuRuleset.osu,
      };
      await dao.addOrUpdate(referenceAppUser);
      const result = await dao.get(
        referenceAppUser.id,
        referenceAppUser.server
      );
      assert.notStrictEqual(result, undefined);
      assert.strictEqual(result!.osuId, referenceAppUser.osuId);
      assert.strictEqual(result!.username, referenceAppUser.username);
      assert.strictEqual(result!.ruleset, referenceAppUser.ruleset);

      const oldEntry = await dao.get(exampleAppUser.id, exampleAppUser.server);
      assert.notStrictEqual(oldEntry, undefined);
    });
  });
});
