/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {UserBestPlaysVk} from '../../../../main/presentation/vk/commands/UserBestPlaysVk';
import {
  createWithOnlyText,
  createWithPayload,
} from '../../../mocks/presentation/VkMessageContext';
import {VkMessageContext} from '../../../../main/presentation/vk/VkMessageContext';
import {SERVERS} from '../../../../main/presentation/common/OsuServers';
import {APP_CODE_NAME} from '../../../../main/App';
import {OsuServer} from '../../../../main/primitives/OsuServer';
import {
  ALL_OSU_RULESETS,
  OsuRuleset,
} from '../../../../main/primitives/OsuRuleset';
import {FakeBanchoApi} from '../../../mocks/data/http/BanchoApi';
import {SqliteDb} from '../../../../main/data/persistence/db/SqliteDb';
import {OsuUserSnapshotsTable} from '../../../../main/data/persistence/db/tables/OsuUserSnapshotsTable';
import {AppUserApiRequestsCountsTable} from '../../../../main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {TimeWindowsTable} from '../../../../main/data/persistence/db/tables/TimeWindowsTable';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../../main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserRecentApiRequestsDaoImpl} from '../../../../main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {OsuUsersDaoImpl} from '../../../../main/data/dao/OsuUsersDaoImpl';
import {AppUsersTable} from '../../../../main/data/persistence/db/tables/AppUsersTable';
import {AppUsersDaoImpl} from '../../../../main/data/dao/AppUsersDaoImpl';
import {SqlDbTable} from '../../../../main/data/persistence/db/SqlDbTable';
import {
  getFakeOsuUserInfo,
  getFakeOsuUserUsername,
  getFakeUserBestScoreInfos,
} from '../../../mocks/Generators';
import {AppUser} from '../../../../main/data/repository/models/AppUser';
import {VkIdConverter} from '../../../../main/presentation/vk/VkIdConverter';
import {GetAppUserInfoUseCase} from '../../../../main/application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {FakeScoreSimulationApi} from '../../../mocks/data/http/ScoreSimulationApi';
import {ScoreSimulationsDaoImpl} from '../../../../main/data/dao/ScoreSimulationsDaoImpl';
import {CachedOsuUsersDaoImpl} from '../../../../main/data/dao/CachedOsuUsersDaoImpl';
import {OsuUserBestScoresDaoImpl} from '../../../../main/data/dao/OsuUserBestScoresDaoImpl';
import {GetUserBestPlaysUseCase} from '../../../../main/application/usecases/get_user_best_plays/GetUserBestPlaysUseCase';
import {
  BestPlay,
  OsuUserBestPlays,
} from '../../../../main/application/usecases/get_user_best_plays/GetUserBestPlaysResponse';
import {OsuUserBestScoreInfo} from '../../../../main/data/http/boundary/OsuUserBestScoreInfo';
import {ModAcronym} from '../../../../main/primitives/ModAcronym';
import {MainTextProcessor} from '../../../../main/presentation/common/arg_processing/MainTextProcessor';
import {
  MODE,
  MODS,
  OWN_COMMAND_PREFIX,
  QUANTITY,
  SERVER_PREFIX,
  START_POSITION,
  USERNAME,
} from '../../../../main/presentation/common/arg_processing/CommandArguments';
import {VkBeatmapCoversTable} from '../../../../main/presentation/data/repositories/VkBeatmapCoversRepository';
import {VkChatLastBeatmapsTable} from '../../../../main/presentation/data/repositories/VkChatLastBeatmapsRepository';

describe('UserBestPlaysVk', function () {
  let tables: SqlDbTable[];
  let appUsers: AppUsersTable;
  let command: UserBestPlaysVk;
  {
    const apis = [new FakeBanchoApi()];
    const db = new SqliteDb(':memory:');
    const osuUserSnapshots = new OsuUserSnapshotsTable(db);
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsTable(db);
    const timeWindows = new TimeWindowsTable(db);
    appUsers = new AppUsersTable(db);
    const vkBeatmapCovers = new VkBeatmapCoversTable(
      db,
      async () => new ArrayBuffer(0),
      async () => '',
      false
    );
    const vkChatLastBeatmaps = new VkChatLastBeatmapsTable(db);
    const requestsSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      appUserApiRequestsCounts,
      timeWindows
    );
    const recentApiRequestsDao = new AppUserRecentApiRequestsDaoImpl(
      requestsSummariesDao
    );
    const userBestScoresDao = new OsuUserBestScoresDaoImpl(
      apis,
      osuUserSnapshots,
      recentApiRequestsDao
    );
    const scoreSimApi = new FakeScoreSimulationApi();
    const scoreSimulationsDao = new ScoreSimulationsDaoImpl(scoreSimApi);
    const cachedOsuUsersDao = new CachedOsuUsersDaoImpl(osuUserSnapshots);
    const osuUsersDao = new OsuUsersDaoImpl(
      apis,
      osuUserSnapshots,
      recentApiRequestsDao
    );
    const appUsersDao = new AppUsersDaoImpl(appUsers);

    const getUserBestPlaysUseCase = new GetUserBestPlaysUseCase(
      userBestScoresDao,
      scoreSimulationsDao,
      cachedOsuUsersDao,
      osuUsersDao
    );
    const getAppUserInfoUseCase = new GetAppUserInfoUseCase(appUsersDao);

    tables = [
      osuUserSnapshots,
      appUserApiRequestsCounts,
      timeWindows,
      appUsers,
      vkBeatmapCovers,
      vkChatLastBeatmaps,
    ];
    const mainTextProcessor = new MainTextProcessor(' ', "'", '\\');
    const getInitiatorAppUserId = (ctx: VkMessageContext): string => {
      return VkIdConverter.vkUserIdToAppUserId(ctx.senderId);
    };
    const getTargetAppUserId = (() => {
      const getSelfOrQuotedAppUserId = (ctx: VkMessageContext): string => {
        return VkIdConverter.vkUserIdToAppUserId(
          ctx.replyMessage?.senderId ?? ctx.senderId
        );
      };
      const adminId = 0;
      const getSelfAppUserId = (ctx: VkMessageContext): string => {
        if (ctx.senderId !== adminId) {
          return VkIdConverter.vkUserIdToAppUserId(ctx.senderId);
        }
        return VkIdConverter.vkUserIdToAppUserId(
          ctx.replyMessage?.senderId ?? ctx.senderId
        );
      };
      return (settings: {
        canTargetOtherUsersAsNonAdmin: boolean;
      }): ((ctx: VkMessageContext) => string) => {
        if (settings.canTargetOtherUsersAsNonAdmin) {
          return getSelfOrQuotedAppUserId;
        }
        return getSelfAppUserId;
      };
    })();
    const saveLastSeenBeatmapId = (
      ctx: VkMessageContext,
      server: OsuServer,
      beatmapId: number
    ): Promise<void> => {
      return vkChatLastBeatmaps.save(ctx.peerId, server, beatmapId);
    };
    command = new UserBestPlaysVk(
      mainTextProcessor,
      getInitiatorAppUserId,
      getTargetAppUserId({canTargetOtherUsersAsNonAdmin: true}),
      saveLastSeenBeatmapId,
      getUserBestPlaysUseCase,
      getAppUserInfoUseCase,
      vkBeatmapCovers
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
      const startPosition = 2;
      const quantity = 5;
      const mods = [
        {acronym: new ModAcronym('hd'), isOptional: true},
        {acronym: new ModAcronym('dt'), isOptional: false},
      ];
      const mode = OsuRuleset.osu;

      const usernameArg = USERNAME.unparse(username);
      const startPositionArg = START_POSITION.unparse(startPosition);
      const quantityArg = QUANTITY.unparse(quantity);
      const modeArg = MODE.unparse(mode);
      const modsArg = MODS.unparse(mods);
      for (const serverAndPrefix of SERVERS) {
        const server = serverAndPrefix.server;
        const serverArg = SERVER_PREFIX.unparse(server);
        for (const prefix of command.prefixes) {
          const prefixArg = OWN_COMMAND_PREFIX(command.prefixes).unparse(
            prefix
          );
          const goodText = `${serverArg} ${prefixArg} ${usernameArg} ${startPositionArg} ${quantityArg} ${modsArg} ${modeArg}`;
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
          assert.strictEqual(
            matchResult.commandArgs?.startPosition,
            startPosition
          );
          assert.strictEqual(matchResult.commandArgs?.quantity, quantity);
          assert.strictEqual(
            matchResult.commandArgs?.mods?.length,
            mods.length
          );
          assert.strictEqual(matchResult.commandArgs?.mode, mode);
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
      const startPosition = 3;
      const quantity = 6;
      const mods = [
        {acronym: new ModAcronym('hd'), isOptional: true},
        {acronym: new ModAcronym('hr'), isOptional: false},
      ];
      const mode = OsuRuleset.osu;

      const usernameArg = USERNAME.unparse(username);
      const startPositionArg = START_POSITION.unparse(startPosition);
      const quantityArg = QUANTITY.unparse(quantity);
      const modeArg = MODE.unparse(mode);
      const modsArg = MODS.unparse(mods);
      for (const serverAndPrefix of SERVERS) {
        const server = serverAndPrefix.server;
        const serverArg = SERVER_PREFIX.unparse(server);
        for (const prefix of command.prefixes) {
          const prefixArg = OWN_COMMAND_PREFIX(command.prefixes).unparse(
            prefix
          );
          const goodText = `${serverArg} ${prefixArg} ${usernameArg} ${startPositionArg} ${quantityArg} ${modsArg} ${modeArg}`;
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
          assert.strictEqual(
            matchResult.commandArgs?.startPosition,
            startPosition
          );
          assert.strictEqual(matchResult.commandArgs?.quantity, quantity);
          assert.strictEqual(
            matchResult.commandArgs?.mods?.length,
            mods.length
          );
          assert.strictEqual(matchResult.commandArgs?.mode, mode);
        }
      }
    });
  });
  describe('#process()', function () {
    it('should return OsuUserBestPlays as undefined when there is no user with specified username', async function () {
      const usernameInput = 'alskdjfhg';
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.osu;
      const viewParams = await command.process(
        {
          server: server,
          username: usernameInput,
          startPosition: 2,
          quantity: 3,
          mods: [
            {acronym: new ModAcronym('HD'), isOptional: true},
            {acronym: new ModAcronym('DT'), isOptional: false},
          ],
          mode: mode,
        },
        createWithOnlyText({
          senderId: -1,
          text: 'should not be relevant',
        }) as VkMessageContext
      );
      assert.strictEqual(viewParams.server, server);
      assert.strictEqual(viewParams.mode, mode);
      assert.strictEqual(viewParams.usernameInput, usernameInput);
      assert.strictEqual(viewParams.bestPlays, undefined);
    });
    it('should return OsuUserBestPlays as undefined when there is no AppUser associated with sender VK id', async function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.osu;
      const viewParams = await command.process(
        {
          server: server,
          username: undefined,
          startPosition: 2,
          quantity: 3,
          mods: [
            {acronym: new ModAcronym('HD'), isOptional: true},
            {acronym: new ModAcronym('DT'), isOptional: false},
          ],
          mode: mode,
        },
        createWithOnlyText({
          senderId: -1,
          text: 'should not be relevant',
        }) as VkMessageContext
      );
      assert.strictEqual(viewParams.server, server);
      assert.strictEqual(viewParams.mode, mode);
      assert.strictEqual(viewParams.usernameInput, undefined);
      assert.strictEqual(viewParams.bestPlays, undefined);
    });
    it('should return OsuUserBestPlays when there is user with specified username', async function () {
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
              username: username,
              startPosition: 2,
              quantity: 3,
              mods: [
                {acronym: new ModAcronym('HD'), isOptional: true},
                {acronym: new ModAcronym('DT'), isOptional: false},
              ],
              mode: undefined,
            },
            createWithOnlyText({
              senderId: -1,
              text: 'should not be relevant',
            }) as VkMessageContext
          );
          assert.strictEqual(viewParams.server, server);
          assert.strictEqual(viewParams.mode, osuUser.preferredMode);
          assert.strictEqual(viewParams.usernameInput, username);
          assert.notStrictEqual(viewParams.bestPlays?.plays.length, 0);
        }
      }
    });
    it('should correctly return OsuUserBestPlays for specified mode', async function () {
      const server = OsuServer.Bancho;
      const osuUsers = [1, 3, 5, 7, 9].map(n =>
        getFakeOsuUserInfo(n, undefined)
      );
      for (const osuUser of osuUsers) {
        if (osuUser === undefined) {
          throw Error('All osu user ids used in this test should be valid');
        }
        const modes = ALL_OSU_RULESETS;
        for (const mode of modes) {
          const viewParams = await command.process(
            {
              server: server,
              username: osuUser.username,
              startPosition: 2,
              quantity: 3,
              mods: [
                {acronym: new ModAcronym('HD'), isOptional: true},
                {acronym: new ModAcronym('DT'), isOptional: false},
              ],
              mode: OsuRuleset[mode],
            },
            createWithOnlyText({
              senderId: -1,
              text: 'should not be relevant',
            }) as VkMessageContext
          );
          assert.strictEqual(viewParams.server, server);
          assert.strictEqual(viewParams.mode, OsuRuleset[mode]);
          assert.strictEqual(viewParams.usernameInput, osuUser.username);
          assert.strictEqual(viewParams.bestPlays?.username, osuUser.username);
        }
      }
    });
    it('should return OsuUserBestPlays when there is AppUser associated with sender VK id', async function () {
      const appUser = existingAppAndOsuUser.appUser;
      const viewParams = await command.process(
        {
          server: appUser.server,
          username: undefined,
          startPosition: 2,
          quantity: 3,
          mods: [
            {acronym: new ModAcronym('HD'), isOptional: true},
            {acronym: new ModAcronym('DT'), isOptional: false},
          ],
          mode: undefined,
        },
        createWithOnlyText({
          senderId: VkIdConverter.appUserIdToVkUserId(appUser.id),
          text: 'should not be relevant',
        }) as VkMessageContext
      );
      assert.strictEqual(viewParams.server, appUser.server);
      assert.strictEqual(viewParams.mode, appUser.ruleset);
      assert.strictEqual(viewParams.usernameInput, undefined);
      assert.strictEqual(viewParams.bestPlays?.username, appUser.username);
      assert.notStrictEqual(viewParams.bestPlays?.plays.length, 0);
    });
  });
  describe('#createOutputMessage()', function () {
    it('should return "username not bound" message if username is not specified and there is no username bound to this VK account', async function () {
      const server = OsuServer.Bancho;
      const outputMessage = await command.createOutputMessage({
        server: server,
        mode: undefined,
        usernameInput: undefined,
        bestPlays: undefined,
      });
      assert.strictEqual(
        outputMessage.text,
        (await command.createUsernameNotBoundMessage(server)).text
      );
    });
    it('should return "user not found" message if username is specified and there is no information about corresponding user', async function () {
      const server = OsuServer.Bancho;
      const usernameInput = 'loremipsum';
      const outputMessage = await command.createOutputMessage({
        server: server,
        mode: undefined,
        usernameInput: usernameInput,
        bestPlays: undefined,
      });
      assert.strictEqual(
        outputMessage.text,
        (await command.createUserNotFoundMessage(server, usernameInput)).text
      );
    });
    it('should return "user plays" message if username is not specified but there is bound account info', async function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.ctb;
      const usernameInput = undefined;
      const bestPlays: OsuUserBestPlays = {
        username: 'usrnm',
        plays: [scoreInfoToBestPlay(getFakeUserBestScoreInfos(123, mode)[0])],
      };
      const outputMessage = await command.createOutputMessage({
        server: server,
        mode: mode,
        usernameInput: usernameInput,
        bestPlays: bestPlays,
      });
      assert.strictEqual(
        outputMessage.text,
        (await command.createBestPlaysMessage(bestPlays, server, mode)).text
      );
    });
    it('should return "user plays" message if username is specified and there is corresponding account info', async function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.ctb;
      const usernameInput = 'loremipsum';
      const bestPlays: OsuUserBestPlays = {
        username: 'usrnm',
        plays: [scoreInfoToBestPlay(getFakeUserBestScoreInfos(123, mode)[0])],
      };
      const outputMessage = await command.createOutputMessage({
        server: server,
        mode: mode,
        usernameInput: usernameInput,
        bestPlays: bestPlays,
      });
      assert.strictEqual(
        outputMessage.text,
        (await command.createBestPlaysMessage(bestPlays, server, mode)).text
      );
    });
  });
});

function scoreInfoToBestPlay(bestScoreInfo: OsuUserBestScoreInfo): BestPlay {
  const s = bestScoreInfo;
  return {
    absolutePosition: 100,
    beatmapset: {
      id: 1,
      status: 'Ranked',
      artist: s.beatmapset.artist,
      title: s.beatmapset.title,
      creator: s.beatmapset.creator,
      coverUrl: '',
    },
    beatmap: {
      id: s.beatmap.id,
      difficultyName: s.beatmap.version,
      totalLength: s.beatmap.totalLength,
      drainLength: s.beatmap.hitLength,
      bpm: s.beatmap.bpm,
      estimatedStarRating: s.beatmap.difficultyRating,
      ar: s.beatmap.ar,
      cs: s.beatmap.cs,
      od: s.beatmap.od,
      hp: s.beatmap.hp,
      maxCombo: 100,
      url: s.beatmap.url,
    },
    mods: s.mods,
    passed: s.passed,
    totalScore: s.totalScore,
    combo: s.maxCombo,
    accuracy: s.accuracy,
    pp: s.pp ?? 100,
    orderedHitcounts: [1, 2, 3, 4, 5, 6],
    grade: s.rank,
    date: 123123123,
  };
}
