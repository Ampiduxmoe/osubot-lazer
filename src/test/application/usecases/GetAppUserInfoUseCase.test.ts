/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {GetAppUserInfoRequest} from '../../../main/application/usecases/get_app_user_info/GetAppUserInfoRequest';
import {GetAppUserInfoUseCase} from '../../../main/application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuServer} from '../../../main/primitives/OsuServer';
import {AppUsersDaoImpl} from '../../../main/data/dao/AppUsersDaoImpl';
import {AppUsersTable} from '../../../main/data/persistence/db/tables/AppUsersTable';
import {SqliteDb} from '../../../main/data/persistence/db/SqliteDb';
import {SqlDbTable} from '../../../main/data/persistence/db/SqlDbTable';
import {OsuRuleset} from '../../../main/primitives/OsuRuleset';
import {AppUser} from '../../../main/data/repository/models/AppUser';

describe('GetAppUserInfoUseCase', function () {
  let tables: SqlDbTable[];
  let appUsers: AppUsersTable;
  let usecase: GetAppUserInfoUseCase;
  {
    const db = new SqliteDb(':memory:');
    appUsers = new AppUsersTable(db);
    const appUsersDao = new AppUsersDaoImpl(appUsers);

    tables = [appUsers];
    usecase = new GetAppUserInfoUseCase(appUsersDao);
  }

  const exampleAppUser: AppUser = {
    id: 'AddedUserAppUserId',
    server: OsuServer.Bancho,
    osuId: 123,
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
      assert.strictEqual(resultUserInfo.osuId, existingAppUser.osuId);
      assert.strictEqual(resultUserInfo.ruleset, existingAppUser.ruleset);
      assert.strictEqual(resultUserInfo.username, existingAppUser.username);
    });
  });
});
