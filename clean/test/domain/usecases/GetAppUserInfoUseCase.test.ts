/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {GetAppUserInfoRequest} from '../../../src/main/domain/usecases/get_app_user_info/GetAppUserInfoRequest';
import {GetAppUserInfoUseCase} from '../../../src/main/domain/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {AppUsersDaoImpl} from '../../../src/main/data/dao/AppUsersDaoImpl';
import {
  AppUsers,
  AppUsersImpl,
} from '../../../src/main/data/raw/db/tables/AppUsers';
import {SqliteDb} from '../../../src/main/data/raw/db/SqliteDb';
import {SqlDbTable} from '../../../src/main/data/raw/db/SqlDbTable';
import {OsuRuleset} from '../../../src/primitives/OsuRuleset';
import {AppUser} from '../../../src/main/data/raw/db/entities/AppUser';

describe('GetAppUserInfoUseCase', function () {
  let tables: SqlDbTable<object, object>[];
  let appUsers: AppUsers;
  let usecase: GetAppUserInfoUseCase;
  {
    const db = new SqliteDb(':memory:');
    appUsers = new AppUsersImpl(db);
    const appUsersDao = new AppUsersDaoImpl(appUsers);

    tables = [appUsers];
    usecase = new GetAppUserInfoUseCase(appUsersDao);
  }

  const exampleAppUser: AppUser = {
    id: 'AddedUserAppUserId',
    server: OsuServer.Bancho,
    osu_id: 123,
    username: 'AddedUserUsername',
    ruleset: OsuRuleset.osu,
  };

  before(async function () {
    await Promise.all(tables.map(t => t.createTable()));
    await appUsers.add(exampleAppUser);
  });

  const existingAppUser = exampleAppUser;
  describe('#execute()', function () {
    it('should return AppUserInfo as undefined when user does not exist', async function () {
      const request: GetAppUserInfoRequest = {
        id: 'AppUserIdThatDoesNotExist',
        server: OsuServer.Bancho,
      };
      const result = await usecase.execute(request);
      assert.strictEqual(result.userInfo, undefined);
    });
    it('should return correct AppUserInfo when user exists', async function () {
      const request: GetAppUserInfoRequest = {
        id: existingAppUser.id,
        server: existingAppUser.server,
      };
      const result = await usecase.execute(request);
      assert.notStrictEqual(result.userInfo, undefined);
      const resultUserInfo = result.userInfo!;
      assert.strictEqual(resultUserInfo.osuId, existingAppUser.osu_id);
      assert.strictEqual(resultUserInfo.ruleset, existingAppUser.ruleset);
      assert.strictEqual(resultUserInfo.username, existingAppUser.username);
    });
  });
});
