/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {APP_CODE_NAME} from '../../../../main/App';
import {GetAppUserInfoUseCase} from '../../../../main/application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {GetOsuUserInfoUseCase} from '../../../../main/application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../../main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserRecentApiRequestsDaoImpl} from '../../../../main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUsersDaoImpl} from '../../../../main/data/dao/AppUsersDaoImpl';
import {OsuUsersDaoImpl} from '../../../../main/data/dao/OsuUsersDaoImpl';
import {SqlDbTable} from '../../../../main/data/persistence/db/SqlDbTable';
import {SqliteDb} from '../../../../main/data/persistence/db/SqliteDb';
import {AppUserApiRequestsCountsTable} from '../../../../main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {AppUsersTable} from '../../../../main/data/persistence/db/tables/AppUsersTable';
import {OsuUserSnapshotsTable} from '../../../../main/data/persistence/db/tables/OsuUserSnapshotsTable';
import {TimeWindowsTable} from '../../../../main/data/persistence/db/tables/TimeWindowsTable';
import {AppUser} from '../../../../main/data/repository/models/AppUser';
import {
  GetInitiatorAppUserId,
  GetTargetAppUserId,
} from '../../../../main/presentation/commands/common/Signatures';
import {
  MODE,
  OWN_COMMAND_PREFIX,
  SERVER_PREFIX,
  USERNAME,
} from '../../../../main/presentation/common/arg_processing/CommandArguments';
import {MainTextProcessor} from '../../../../main/presentation/common/arg_processing/MainTextProcessor';
import {SERVERS} from '../../../../main/presentation/common/OsuServers';
import {UserInfoVk} from '../../../../main/presentation/vk/commands/UserInfoVk';
import {VkIdConverter} from '../../../../main/presentation/vk/VkIdConverter';
import {VkMessageContext} from '../../../../main/presentation/vk/VkMessageContext';
import {OsuRuleset} from '../../../../main/primitives/OsuRuleset';
import {OsuServer} from '../../../../main/primitives/OsuServer';
import {FakeBanchoApi} from '../../../mocks/data/http/BanchoApi';
import {
  getFakeOsuUserInfo,
  getFakeOsuUserUsername,
} from '../../../mocks/Generators';
import {
  createWithOnlyText,
  createWithPayload,
} from '../../../mocks/presentation/VkMessageContext';

describe('UserInfoVk', function () {
  let tables: SqlDbTable[];
  let appUsers: AppUsersTable;
  let command: UserInfoVk;
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
    const mainTextProcessor = new MainTextProcessor(' ', ["'", '"', '`'], '\\');
    const getInitiatorAppUserId: GetInitiatorAppUserId<
      VkMessageContext
    > = ctx => {
      return VkIdConverter.vkUserIdToAppUserId(ctx.senderId);
    };
    const getTargetAppUserId: GetTargetAppUserId<VkMessageContext> = (
      ctx,
      options
    ) => {
      const adminId = 0;
      return VkIdConverter.vkUserIdToAppUserId(
        options.canTargetOthersAsNonAdmin || ctx.senderId === adminId
          ? ctx.replyMessage?.senderId ?? ctx.senderId
          : ctx.senderId
      );
    };
    command = new UserInfoVk(
      mainTextProcessor,
      getInitiatorAppUserId,
      getTargetAppUserId,
      getOsuUserInfo,
      getAppUserInfo
    );
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

  describe('#matchMessage()', function () {
    it('should not match empty message', function () {
      const msg = createWithOnlyText({
        senderId: 1,
        text: '',
      }) as VkMessageContext;
      const matchResult = command.matchMessage(msg);
      assert.strictEqual(matchResult.isMatch, false);
    });
    it('should not match unrelated message', function () {
      const unrelatedWords = ['x', 'lorem', 'ipsum', 'dolor', 'sit', 'amet'];
      for (let i = 0; i < unrelatedWords.length; i++) {
        const msg = createWithOnlyText({
          senderId: 1,
          text: unrelatedWords.slice(0, i + 1).join(' '),
        }) as VkMessageContext;
        const matchResult = command.matchMessage(msg);
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
        const matchResult = command.matchMessage(msg);
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
        const matchResult = command.matchMessage(msg);
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
        const matchResult = command.matchMessage(msg);
        assert.strictEqual(matchResult.isMatch, false);
      }
    });
    it('should match short form', function () {
      for (const serverAndPrefix of SERVERS) {
        const server = serverAndPrefix.server;
        const serverArg = SERVER_PREFIX.unparse(server);
        for (const prefix of command.prefixes) {
          const prefixArg = OWN_COMMAND_PREFIX(command.prefixes).unparse(
            prefix
          );
          const goodText = `${serverArg} ${prefixArg}`;
          const msg = createWithOnlyText({
            senderId: 1,
            text: goodText,
          }) as VkMessageContext;
          const matchResult = command.matchMessage(msg);
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
      const username = 'username';
      const mode = OsuRuleset.mania;

      const usernameArg = USERNAME.unparse(username);
      const modeArg = MODE.unparse(mode);
      for (const serverAndPrefix of SERVERS) {
        const server = serverAndPrefix.server;
        const serverArg = SERVER_PREFIX.unparse(server);
        for (const prefix of command.prefixes) {
          const prefixArg = OWN_COMMAND_PREFIX(command.prefixes).unparse(
            prefix
          );
          const goodText = `${serverArg} ${prefixArg} ${usernameArg} ${modeArg}`;
          const msg = createWithOnlyText({
            senderId: 1,
            text: goodText,
          }) as VkMessageContext;
          const matchResult = command.matchMessage(msg);
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
        const server = serverAndPrefix.server;
        const serverArg = SERVER_PREFIX.unparse(server);
        for (const prefix of command.prefixes) {
          const prefixArg = OWN_COMMAND_PREFIX(command.prefixes).unparse(
            prefix
          );
          const goodText = `${serverArg} ${prefixArg}`;
          const msg = createWithPayload({
            senderId: 1,
            text: 'lorem ipsum',
            payload: {
              target: APP_CODE_NAME,
              command: goodText,
            },
          }) as VkMessageContext;
          const matchResult = command.matchMessage(msg);
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
      const username = 'username';
      const mode = OsuRuleset.ctb;

      const usernameArg = USERNAME.unparse(username);
      const modeArg = MODE.unparse(mode);
      for (const serverAndPrefix of SERVERS) {
        const server = serverAndPrefix.server;
        const serverArg = SERVER_PREFIX.unparse(server);
        for (const prefix of command.prefixes) {
          const prefixArg = OWN_COMMAND_PREFIX(command.prefixes).unparse(
            prefix
          );
          const goodText = `${serverArg} ${prefixArg} ${usernameArg} ${modeArg}`;
          const msg = createWithPayload({
            senderId: 1,
            text: 'lorem ipsum',
            payload: {
              target: APP_CODE_NAME,
              command: goodText,
            },
          }) as VkMessageContext;
          const matchResult = command.matchMessage(msg);
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
      const viewParams = await command.process(
        {
          server: server,
          mode: mode,
          username: usernameInput,
        },
        createWithOnlyText({
          senderId: -1,
          text: 'should not be relevant',
        }) as VkMessageContext
      ).resultValue;
      assert.strictEqual(viewParams.server, server);
      assert.strictEqual(viewParams.mode, mode);
      assert.strictEqual(viewParams.usernameInput, usernameInput);
      assert.strictEqual(viewParams.userInfo, undefined);
    });
    it('should return OsuUserInfo as undefined when there is no AppUser associated with sender VK id', async function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.osu;
      const viewParams = await command.process(
        {
          server: server,
          mode: mode,
          username: undefined,
        },
        createWithOnlyText({
          senderId: -1,
          text: 'should not be relevant',
        }) as VkMessageContext
      ).resultValue;
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
          const viewParams = await command.process(
            {
              server: server,
              mode: undefined,
              username: username,
            },
            createWithOnlyText({
              senderId: -1,
              text: 'should not be relevant',
            }) as VkMessageContext
          ).resultValue;
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
          const viewParams = await command.process(
            {
              server: server,
              mode: ruleset,
              username: username,
            },
            createWithOnlyText({
              senderId: -1,
              text: 'should not be relevant',
            }) as VkMessageContext
          ).resultValue;
          assert.strictEqual(viewParams.server, server);
          assert.strictEqual(viewParams.mode, ruleset);
          assert.strictEqual(viewParams.usernameInput, username);
          assert.strictEqual(viewParams.userInfo?.username, osuUser.username);
        }
      }
    });
    it('should return OsuUserInfo when there is AppUser associated with sender VK id', async function () {
      const appUser = existingAppAndOsuUser.appUser;
      const viewParams = await command.process(
        {
          server: appUser.server,
          mode: undefined,
          username: undefined,
        },
        createWithOnlyText({
          senderId: VkIdConverter.appUserIdToVkUserId(appUser.id),
          text: 'should not be relevant',
        }) as VkMessageContext
      ).resultValue;
      assert.strictEqual(viewParams.server, appUser.server);
      assert.strictEqual(viewParams.mode, appUser.ruleset);
      assert.strictEqual(viewParams.usernameInput, undefined);
      assert.strictEqual(viewParams.userInfo?.username, appUser.username);
    });
  });
  describe('#createOutputMessage()', function () {
    it('should return "username not bound" message if username is not specified and there is no username bound to this VK account', async function () {
      const server = OsuServer.Bancho;
      const outputMessage = await command.createOutputMessage({
        server: server,
        mode: undefined,
        usernameInput: undefined,
        userInfo: undefined,
      }).resultValue;
      assert.strictEqual(
        outputMessage.text,
        (await command.createUsernameNotBoundMessage(server).resultValue).text
      );
    });
    it('should return "user not found" message if username is specified and there is no information about corresponding user', async function () {
      const server = OsuServer.Bancho;
      const usernameInput = 'loremipsum';
      const outputMessage = await command.createOutputMessage({
        server: server,
        mode: undefined,
        usernameInput: usernameInput,
        userInfo: undefined,
      }).resultValue;
      assert.strictEqual(
        outputMessage.text,
        (
          await command.createUserNotFoundMessage(server, usernameInput)
            .resultValue
        ).text
      );
    });
    it('should return "user info" message if username is not specified but there is bound account info', async function () {
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
      const outputMessage = await command.createOutputMessage({
        server: server,
        mode: mode,
        usernameInput: usernameInput,
        userInfo: userInfo,
      }).resultValue;
      assert.strictEqual(
        outputMessage.text,
        (
          await command.createUserInfoMessage(server, mode, userInfo)
            .resultValue
        ).text
      );
    });
    it('should return "user info" message if username is specified and there is corresponding account info', async function () {
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
      const outputMessage = await command.createOutputMessage({
        server: server,
        mode: mode,
        usernameInput: usernameInput,
        userInfo: userInfo,
      }).resultValue;
      assert.strictEqual(
        outputMessage.text,
        (
          await command.createUserInfoMessage(server, mode, userInfo)
            .resultValue
        ).text
      );
    });
  });
});
