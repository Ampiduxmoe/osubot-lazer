/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {UserInfo} from '../../src/main/presentation/vk/commands/UserInfo';
import {GetAppUserInfoUseCase} from '../../src/main/application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {GetOsuUserInfoUseCase} from '../../src/main/application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {
  createWithOnlyText,
  createWithPayload,
} from '../mocks/presentation/VkMessageContext';
import {VkMessageContext} from '../../src/main/presentation/vk/VkMessageContext';
import {SERVERS} from '../../src/main/presentation/common/OsuServers';
import {APP_CODE_NAME} from '../../src/main/App';
import {OsuServer} from '../../src/primitives/OsuServer';
import {OsuRuleset} from '../../src/primitives/OsuRuleset';
import {FakeBanchoApi} from '../mocks/data/http/BanchoApi';
import {SqliteDb} from '../../src/main/data/persistence/db/SqliteDb';
import {OsuUserSnapshotsTable} from '../../src/main/data/persistence/db/tables/OsuUserSnapshotsTable';
import {AppUserApiRequestsCountsTable} from '../../src/main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {TimeWindowsTable} from '../../src/main/data/persistence/db/tables/TimeWindowsTable';
import {AppUserApiRequestsSummariesDaoImpl} from '../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserRecentApiRequestsDaoImpl} from '../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {OsuUsersDaoImpl} from '../../src/main/data/dao/OsuUsersDaoImpl';
import {AppUsersTable} from '../../src/main/data/persistence/db/tables/AppUsersTable';
import {AppUsersDaoImpl} from '../../src/main/data/dao/AppUsersDaoImpl';
import {SqlDbTable} from '../../src/main/data/persistence/db/SqlDbTable';
import {getFakeOsuUserInfo, getFakeOsuUserUsername} from '../mocks/Generators';
import {AppUser} from '../../src/main/data/repository/models/AppUser';
import {VkIdConverter} from '../../src/main/presentation/vk/VkIdConverter';

describe('UserInfo', function () {
  let tables: SqlDbTable[];
  let appUsers: AppUsersTable;
  let command: UserInfo;
  {
    const apis = [new FakeBanchoApi()];
    const db = new SqliteDb(':memory:');
    const osuUserSnapshots = new OsuUserSnapshotsTable(db);
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsTable(db);
    const timeWindows = new TimeWindowsTable(db);
    appUsers = new AppUsersTable(db);
    const requestsSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      appUserApiRequestsCounts,
      timeWindows
    );
    const recentApiRequestsDao = new AppUserRecentApiRequestsDaoImpl(
      requestsSummariesDao
    );
    const osuUsersDao = new OsuUsersDaoImpl(
      apis,
      osuUserSnapshots,
      recentApiRequestsDao
    );
    const appUsersDao = new AppUsersDaoImpl(appUsers);

    const getOsuUserInfo = new GetOsuUserInfoUseCase(osuUsersDao);
    const getAppUserInfo = new GetAppUserInfoUseCase(appUsersDao);

    tables = [
      osuUserSnapshots,
      appUserApiRequestsCounts,
      timeWindows,
      appUsers,
    ];
    command = new UserInfo(getOsuUserInfo, getAppUserInfo);
  }

  const exampleAppUser: AppUser = {
    id: VkIdConverter.vkUserIdToAppUserId(123123),
    server: OsuServer.Bancho,
    osuId: 123,
    username:
      getFakeOsuUserUsername(123) ??
      (() => {
        throw Error('All osu user ids used in this test should be valid');
      })(),
    ruleset: OsuRuleset.osu,
  };
  const exampleOsuUser =
    getFakeOsuUserInfo(123, OsuRuleset.osu) ??
    (() => {
      throw Error('All osu user ids used in this test should be valid');
    })();
  const existingAppAndOsuUser = {
    appUser: exampleAppUser,
    osuUser: exampleOsuUser,
  };

  before(async function () {
    await Promise.all(tables.map(t => t.createTable()));
    await appUsers.add(exampleAppUser);
  });

  describe('#matchVkMessage()', function () {
    it('should not match empty message', function () {
      const msg = createWithOnlyText({
        senderId: 1,
        text: '',
      }) as VkMessageContext;
      const matchResult = command.matchVkMessage(msg);
      assert.strictEqual(matchResult.isMatch, false);
    });
    it('should not match unrelated message', function () {
      const unrelatedWords = ['x', 'lorem', 'ipsum', 'dolor', 'sit', 'amet'];
      for (let i = 0; i < unrelatedWords.length; i++) {
        const msg = createWithOnlyText({
          senderId: 1,
          text: unrelatedWords.slice(0, i + 1).join(' '),
        }) as VkMessageContext;
        const matchResult = command.matchVkMessage(msg);
        assert.strictEqual(matchResult.isMatch, false);
      }
    });
    it('should not match when message has redundant words', function () {
      const goodText = `${SERVERS[0].prefix} ${command.prefixes[0]}`;
      const goodTextWithUsername = goodText + ' username';
      for (const text of [goodText, goodTextWithUsername]) {
        const msg = createWithOnlyText({
          senderId: 1,
          text: text + ' ][ lorem ! ipsum',
        }) as VkMessageContext;
        const matchResult = command.matchVkMessage(msg);
        assert.strictEqual(matchResult.isMatch, false);
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
        const matchResult = command.matchVkMessage(msg);
        assert.strictEqual(matchResult.isMatch, false);
      }
    });
    it('should not match incorrect payload', function () {
      const goodText = `${SERVERS[0].prefix} ${command.prefixes[0]}`;
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
        const matchResult = command.matchVkMessage(msg);
        assert.strictEqual(matchResult.isMatch, false);
      }
    });
    it('should match short form', function () {
      for (const serverAndPrefix of SERVERS) {
        for (const prefix of command.prefixes) {
          const goodText = `${serverAndPrefix.prefix} ${prefix}`;
          const msg = createWithOnlyText({
            senderId: 1,
            text: goodText,
          }) as VkMessageContext;
          const matchResult = command.matchVkMessage(msg);
          assert.strictEqual(matchResult.isMatch, true);
          assert.strictEqual(
            matchResult.commandArgs?.server,
            serverAndPrefix.server
          );
          assert.strictEqual(matchResult.commandArgs?.username, undefined);
        }
      }
    });
    it('should match full form with username', function () {
      for (const serverAndPrefix of SERVERS) {
        for (const prefix of command.prefixes) {
          const username = 'username';
          const goodText = `${serverAndPrefix.prefix} ${prefix} ${username} mode=mania`;
          const msg = createWithOnlyText({
            senderId: 1,
            text: goodText,
          }) as VkMessageContext;
          const matchResult = command.matchVkMessage(msg);
          assert.strictEqual(matchResult.isMatch, true);
          assert.strictEqual(
            matchResult.commandArgs?.server,
            serverAndPrefix.server
          );
          assert.strictEqual(matchResult.commandArgs?.username, username);
        }
      }
    });
    it('should match short form payload', function () {
      for (const serverAndPrefix of SERVERS) {
        for (const prefix of command.prefixes) {
          const goodText = `${serverAndPrefix.prefix} ${prefix}`;
          const msg = createWithPayload({
            senderId: 1,
            text: 'lorem ipsum',
            payload: {
              target: APP_CODE_NAME,
              command: goodText,
            },
          }) as VkMessageContext;
          const matchResult = command.matchVkMessage(msg);
          assert.strictEqual(matchResult.isMatch, true);
          assert.strictEqual(
            matchResult.commandArgs?.server,
            serverAndPrefix.server
          );
          assert.strictEqual(matchResult.commandArgs?.username, undefined);
        }
      }
    });
    it('should match full form payload with username', function () {
      for (const serverAndPrefix of SERVERS) {
        for (const prefix of command.prefixes) {
          const username = 'username';
          const goodText = `${serverAndPrefix.prefix} ${prefix} ${username} mode=ctb`;
          const msg = createWithPayload({
            senderId: 1,
            text: 'lorem ipsum',
            payload: {
              target: APP_CODE_NAME,
              command: goodText,
            },
          }) as VkMessageContext;
          const matchResult = command.matchVkMessage(msg);
          assert.strictEqual(matchResult.isMatch, true);
          assert.strictEqual(
            matchResult.commandArgs?.server,
            serverAndPrefix.server
          );
          assert.strictEqual(matchResult.commandArgs?.username, username);
        }
      }
    });
  });
  describe('#process()', function () {
    it('should return OsuUserInfo as undefined when there is no user with specified username', async function () {
      const usernameInput = 'alskdjfhg';
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.osu;
      const viewParams = await command.process({
        server: server,
        mode: mode,
        username: usernameInput,
        vkUserId: -1,
      });
      assert.strictEqual(viewParams.server, server);
      assert.strictEqual(viewParams.mode, mode);
      assert.strictEqual(viewParams.usernameInput, usernameInput);
      assert.strictEqual(viewParams.userInfo, undefined);
    });
    it('should return OsuUserInfo as undefined when there is no AppUser associated with sender VK id', async function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.osu;
      const viewParams = await command.process({
        server: server,
        mode: mode,
        username: undefined,
        vkUserId: -1,
      });
      assert.strictEqual(viewParams.server, server);
      assert.strictEqual(viewParams.mode, mode);
      assert.strictEqual(viewParams.usernameInput, undefined);
      assert.strictEqual(viewParams.userInfo, undefined);
    });
    it('should return OsuUserInfo when there is user with specified username', async function () {
      const server = OsuServer.Bancho;
      const osuUsers = [1, 3, 5, 7, 9].map(n =>
        getFakeOsuUserInfo(n, undefined)
      );
      for (const osuUser of osuUsers) {
        if (osuUser === undefined) {
          throw Error('All osu user ids used in this test should be valid');
        }
        const usernameVariants = [
          osuUser.username,
          osuUser.username.toLowerCase(),
          osuUser.username.toUpperCase(),
        ];
        for (const username of usernameVariants) {
          const viewParams = await command.process({
            server: server,
            mode: undefined,
            username: username,
            vkUserId: -1,
          });
          assert.strictEqual(viewParams.server, server);
          assert.strictEqual(viewParams.mode, osuUser.preferredMode);
          assert.strictEqual(viewParams.usernameInput, username);
          assert.strictEqual(viewParams.userInfo?.username, osuUser.username);
        }
      }
    });
    it('should correctly return OsuUserInfo for specified mode', async function () {
      const server = OsuServer.Bancho;
      const ruleset = OsuRuleset.taiko;
      const osuUsers = [1, 3, 5, 7, 9].map(n =>
        getFakeOsuUserInfo(n, undefined)
      );
      for (const osuUser of osuUsers) {
        if (osuUser === undefined) {
          throw Error('All osu user ids used in this test should be valid');
        }
        const usernameVariants = [
          osuUser.username,
          osuUser.username.toLowerCase(),
          osuUser.username.toUpperCase(),
        ];
        for (const username of usernameVariants) {
          const viewParams = await command.process({
            server: server,
            mode: ruleset,
            username: username,
            vkUserId: -1,
          });
          assert.strictEqual(viewParams.server, server);
          assert.strictEqual(viewParams.mode, ruleset);
          assert.strictEqual(viewParams.usernameInput, username);
          assert.strictEqual(viewParams.userInfo?.username, osuUser.username);
        }
      }
    });
    it('should return OsuUserInfo when there is AppUser associated with sender VK id', async function () {
      const appUser = existingAppAndOsuUser.appUser;
      const viewParams = await command.process({
        server: appUser.server,
        mode: undefined,
        username: undefined,
        vkUserId: VkIdConverter.appUserIdToVkUserId(appUser.id),
      });
      assert.strictEqual(viewParams.server, appUser.server);
      assert.strictEqual(viewParams.mode, appUser.ruleset);
      assert.strictEqual(viewParams.usernameInput, undefined);
      assert.strictEqual(viewParams.userInfo?.username, appUser.username);
    });
  });
  describe('#createOutputMessage()', function () {
    it('should return "username not bound" message if username is not specified and there is no username bound to this VK account', function () {
      const server = OsuServer.Bancho;
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: undefined,
        usernameInput: undefined,
        userInfo: undefined,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createUsernameNotBoundMessage(server).text
      );
    });
    it('should return "user not found" message if username is specified and there is no information about corresponding user', function () {
      const server = OsuServer.Bancho;
      const usernameInput = 'loremipsum';
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: undefined,
        usernameInput: usernameInput,
        userInfo: undefined,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createUserNotFoundMessage(server, usernameInput).text
      );
    });
    it('should return "user info" message if username is not specified but there is bound account info', function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.ctb;
      const usernameInput = undefined;
      const userInfo = {
        username: 'CoolGuy',
        rankGlobal: 777,
        rankGlobalHighest: 666,
        rankGlobalHighestDate: '1970-01-01T00:00:00.000Z',
        countryCode: 'FAKE',
        rankCountry: 55,
        playcount: 99999,
        lvl: 101,
        playtimeDays: 20,
        playtimeHours: 10,
        playtimeMinutes: 0,
        pp: 19727,
        accuracy: 99.25,
        userId: 123,
      };
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: mode,
        usernameInput: usernameInput,
        userInfo: userInfo,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createUserInfoMessage(server, mode, userInfo).text
      );
    });
    it('should return "user info" message if username is specified and there is corresponding account info', function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.ctb;
      const usernameInput = 'loremipsum';
      const userInfo = {
        username: 'LoremIpsum',
        rankGlobal: 777,
        rankGlobalHighest: 666,
        rankGlobalHighestDate: '1970-01-01T00:00:00.000Z',
        countryCode: 'FAKE',
        rankCountry: 55,
        playcount: 99999,
        lvl: 101,
        playtimeDays: 20,
        playtimeHours: 10,
        playtimeMinutes: 0,
        pp: 19727,
        accuracy: 99.25,
        userId: 123,
      };
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: mode,
        usernameInput: usernameInput,
        userInfo: userInfo,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createUserInfoMessage(server, mode, userInfo).text
      );
    });
  });
});
