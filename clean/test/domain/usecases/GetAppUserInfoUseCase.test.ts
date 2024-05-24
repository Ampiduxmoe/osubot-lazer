/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {GetAppUserInfoRequest} from '../../../src/main/domain/usecases/get_app_user_info/GetAppUserInfoRequest';
import {GetAppUserInfoUseCase} from '../../../src/main/domain/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {VkIdConverter} from '../../../src/main/presentation/vk/VkIdConverter';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {FakeAppUsersDao, getFakeAppUsers} from '../../mocks/AppUsersDao';

describe('GetAppUserInfoUseCase', function () {
  const osuUsers = new FakeAppUsersDao();
  const usecase = new GetAppUserInfoUseCase(osuUsers);
  describe('#execute()', function () {
    it('should return AppUserInfo as undefined when user does not exist', async function () {
      const request: GetAppUserInfoRequest = {
        id: VkIdConverter.vkUserIdToAppUserId(-1),
        server: OsuServer.Bancho,
      };
      const result = await usecase.execute(request);
      assert.equal(result.userInfo, undefined);
    });
    it('should return correct AppUserInfo when user exists', async function () {
      const existingUser = getFakeAppUsers()[0];
      const request: GetAppUserInfoRequest = {
        id: existingUser.id,
        server: existingUser.server,
      };
      const result = await usecase.execute(request);
      assert.equal(result.userInfo?.osuId, existingUser.osuId);
      assert.equal(result.userInfo?.username, existingUser.username);
    });
  });
});
