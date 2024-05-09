/* eslint-disable prefer-arrow-callback */
import {UserInfo} from '../../src/main/presentation/vk/commands/UserInfo';
import {GetAppUserInfoUseCase} from '../../src/main/domain/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {GetOsuUserInfoUseCase} from '../../src/main/domain/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {FakeOsuUsersDao} from '../mocks/OsuUsersDao';
import {FakeAppUsersDao} from '../mocks/AppUsersDao';
import {createWithOnlyText} from '../mocks/VkMessageContext';
import {VkMessageContext} from '../../src/main/presentation/vk/VkMessageContext';
import assert = require('assert');

describe('UserInfo', function () {
  const osuUsers = new FakeOsuUsersDao();
  const appUsers = new FakeAppUsersDao();
  const getRecentPlays = new GetOsuUserInfoUseCase(osuUsers);
  const getAppUserInfo = new GetAppUserInfoUseCase(appUsers);
  const userInfoCommand = new UserInfo(getRecentPlays, getAppUserInfo);
  describe('#matchVkMessage()', function () {
    it('should not match empty message', function () {
      const msg = createWithOnlyText({
        senderId: 1,
        text: '',
      }) as VkMessageContext;
      const matchResult = userInfoCommand.matchVkMessage(msg);
      assert.equal(matchResult.isMatch, false);
    });
  });
});
