/* eslint-disable prefer-arrow-callback */
import {UserInfo} from '../../src/main/presentation/vk/commands/UserInfo';
import {GetAppUserInfoUseCase} from '../../src/main/domain/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {GetOsuUserInfoUseCase} from '../../src/main/domain/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {FakeOsuUsersDao, getFakeOsuUsers} from '../mocks/OsuUsersDao';
import {FakeAppUsersDao, getFakeAppUsers} from '../mocks/AppUsersDao';
import {createWithOnlyText, createWithPayload} from '../mocks/VkMessageContext';
import {VkMessageContext} from '../../src/main/presentation/vk/VkMessageContext';
import assert = require('assert');
import {SERVERS} from '../../src/main/presentation/common/OsuServers';
import {APP_CODE_NAME} from '../../src/main/App';
import {OsuServer} from '../../src/primitives/OsuServer';
import {VkIdConverter} from '../../src/main/presentation/vk/VkIdConverter';
import {OsuRuleset} from '../../src/primitives/OsuRuleset';

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
    it('should not match unrelated message', function () {
      const unrelatedWords = ['x', 'lorem', 'ipsum', 'dolor', 'sit', 'amet'];
      for (let i = 0; i < unrelatedWords.length; i++) {
        const msg = createWithOnlyText({
          senderId: 1,
          text: unrelatedWords.slice(0, i + 1).join(' '),
        }) as VkMessageContext;
        const matchResult = userInfoCommand.matchVkMessage(msg);
        assert.equal(matchResult.isMatch, false);
      }
    });
    it('should not match when message has redundant words', function () {
      const goodText = `${SERVERS[0].prefix} ${userInfoCommand.prefixes[0]}`;
      const goodTextWithUsername = goodText + ' username';
      for (const text of [goodText, goodTextWithUsername]) {
        const msg = createWithOnlyText({
          senderId: 1,
          text: text + ' ][ lorem ! ipsum',
        }) as VkMessageContext;
        const matchResult = userInfoCommand.matchVkMessage(msg);
        assert.equal(matchResult.isMatch, false);
      }
    });
    it('should not match unrelated payload', function () {
      const unrelatedWords = ['x', 'lorem', 'ipsum', 'dolor', 'sit', 'amet'];
      for (let i = 0; i < unrelatedWords.length; i++) {
        const text = unrelatedWords.slice(0, i + 1).join(' ');
        const msg = createWithPayload({
          senderId: 1,
          text: text,
          payload: text,
        }) as VkMessageContext;
        const matchResult = userInfoCommand.matchVkMessage(msg);
        assert.equal(matchResult.isMatch, false);
      }
    });
    it('should not match incorrect payload', function () {
      const goodText = `${SERVERS[0].prefix} ${userInfoCommand.prefixes[0]}`;
      const goodTextWithUsername = goodText + ' username';
      for (const text of [goodText, goodTextWithUsername]) {
        const msg = createWithPayload({
          senderId: 1,
          text: 'lorem ipsum',
          payload: {
            target: APP_CODE_NAME,
            command: text + ' ][ lorem ! ipsum',
          },
        }) as VkMessageContext;
        const matchResult = userInfoCommand.matchVkMessage(msg);
        assert.equal(matchResult.isMatch, false);
      }
    });
    it('should match short form', function () {
      for (const serverAndPrefix of SERVERS) {
        for (const prefix of userInfoCommand.prefixes) {
          const goodText = `${serverAndPrefix.prefix} ${prefix}`;
          const msg = createWithOnlyText({
            senderId: 1,
            text: goodText,
          }) as VkMessageContext;
          const matchResult = userInfoCommand.matchVkMessage(msg);
          assert.equal(matchResult.isMatch, true);
          assert.equal(matchResult.commandArgs?.server, serverAndPrefix.server);
          assert.equal(matchResult.commandArgs?.username, undefined);
        }
      }
    });
    it('should match full form with username', function () {
      for (const serverAndPrefix of SERVERS) {
        for (const prefix of userInfoCommand.prefixes) {
          const username = 'username';
          const goodText = `${serverAndPrefix.prefix} ${prefix} ${username}`;
          const msg = createWithOnlyText({
            senderId: 1,
            text: goodText,
          }) as VkMessageContext;
          const matchResult = userInfoCommand.matchVkMessage(msg);
          assert.equal(matchResult.isMatch, true);
          assert.equal(matchResult.commandArgs?.server, serverAndPrefix.server);
          assert.equal(matchResult.commandArgs?.username, username);
        }
      }
    });
    it('should match short form payload', function () {
      for (const serverAndPrefix of SERVERS) {
        for (const prefix of userInfoCommand.prefixes) {
          const goodText = `${serverAndPrefix.prefix} ${prefix}`;
          const msg = createWithPayload({
            senderId: 1,
            text: 'lorem ipsum',
            payload: {
              target: APP_CODE_NAME,
              command: goodText,
            },
          }) as VkMessageContext;
          const matchResult = userInfoCommand.matchVkMessage(msg);
          assert.equal(matchResult.isMatch, true);
          assert.equal(matchResult.commandArgs?.server, serverAndPrefix.server);
          assert.equal(matchResult.commandArgs?.username, undefined);
        }
      }
    });
    it('should match full form payload with username', function () {
      for (const serverAndPrefix of SERVERS) {
        for (const prefix of userInfoCommand.prefixes) {
          const username = 'username';
          const goodText = `${serverAndPrefix.prefix} ${prefix} ${username}`;
          const msg = createWithPayload({
            senderId: 1,
            text: 'lorem ipsum',
            payload: {
              target: APP_CODE_NAME,
              command: goodText,
            },
          }) as VkMessageContext;
          const matchResult = userInfoCommand.matchVkMessage(msg);
          assert.equal(matchResult.isMatch, true);
          assert.equal(matchResult.commandArgs?.server, serverAndPrefix.server);
          assert.equal(matchResult.commandArgs?.username, username);
        }
      }
    });
  });

  describe('#process()', function () {
    it('should return OsuUserInfo as undefined when there is no user with specified username', async function () {
      const usernameInput = 'alskdjfhg';
      const viewParams = await userInfoCommand.process({
        server: OsuServer.Bancho,
        username: usernameInput,
        vkUserId: -1,
      });
      assert.equal(viewParams.server, OsuServer.Bancho);
      assert.equal(viewParams.usernameInput, usernameInput);
      assert.equal(viewParams.userInfo, undefined);
    });
    it('should return OsuUserInfo as undefined when there is no AppUser associated with sender VK id', async function () {
      const viewParams = await userInfoCommand.process({
        server: OsuServer.Bancho,
        username: undefined,
        vkUserId: -1,
      });
      assert.equal(viewParams.server, OsuServer.Bancho);
      assert.equal(viewParams.usernameInput, undefined);
      assert.equal(viewParams.userInfo, undefined);
    });
    it('should return OsuUserInfo when there is user with specified username', async function () {
      const server = OsuServer.Bancho;
      const ruleset = OsuRuleset.osu;
      const osuUser = getFakeOsuUsers(server, ruleset)[0];
      if (osuUser === undefined) {
        throw Error('Bad fake data');
      }
      const usernameVariants = [
        osuUser.username,
        osuUser.username.toLowerCase(),
        osuUser.username.toUpperCase(),
      ];
      for (const username of usernameVariants) {
        const viewParams = await userInfoCommand.process({
          server: OsuServer.Bancho,
          username: username,
          vkUserId: -1,
        });
        assert.equal(viewParams.server, OsuServer.Bancho);
        assert.equal(viewParams.usernameInput, username);
        assert.equal(viewParams.userInfo?.username, osuUser.username);
      }
    });
    it('should return OsuUserInfo when there is AppUser associated with sender VK id', async function () {
      const appUser = getFakeAppUsers().find(u => u.id.includes('vk'));
      if (appUser === undefined) {
        throw Error('Bad fake data');
      }
      const viewParams = await userInfoCommand.process({
        server: OsuServer.Bancho,
        username: undefined,
        vkUserId: VkIdConverter.appUserIdToVkUserId(appUser.id),
      });
      assert.equal(viewParams.server, OsuServer.Bancho);
      assert.equal(viewParams.usernameInput, undefined);
      assert.equal(viewParams.userInfo?.username, appUser.username);
    });
  });
});
