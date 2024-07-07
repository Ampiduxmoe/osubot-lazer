/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {UserBestPlays} from '../../../../src/main/presentation/vk/commands/UserBestPlays';
import {
  createWithOnlyText,
  createWithPayload,
} from '../../../mocks/presentation/VkMessageContext';
import {VkMessageContext} from '../../../../src/main/presentation/vk/VkMessageContext';
import {SERVERS} from '../../../../src/main/presentation/common/OsuServers';
import {APP_CODE_NAME} from '../../../../src/main/App';
import {OsuServer} from '../../../../src/primitives/OsuServer';
import {
  ALL_OSU_RULESETS,
  OsuRuleset,
} from '../../../../src/primitives/OsuRuleset';
import {FakeBanchoApi} from '../../../mocks/data/http/BanchoApi';
import {SqliteDb} from '../../../../src/main/data/persistence/db/SqliteDb';
import {OsuUserSnapshotsTable} from '../../../../src/main/data/persistence/db/tables/OsuUserSnapshotsTable';
import {AppUserApiRequestsCountsTable} from '../../../../src/main/data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {TimeWindowsTable} from '../../../../src/main/data/persistence/db/tables/TimeWindowsTable';
import {AppUserApiRequestsSummariesDaoImpl} from '../../../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserRecentApiRequestsDaoImpl} from '../../../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {OsuUsersDaoImpl} from '../../../../src/main/data/dao/OsuUsersDaoImpl';
import {AppUsersTable} from '../../../../src/main/data/persistence/db/tables/AppUsersTable';
import {AppUsersDaoImpl} from '../../../../src/main/data/dao/AppUsersDaoImpl';
import {SqlDbTable} from '../../../../src/main/data/persistence/db/SqlDbTable';
import {
  getFakeOsuUserInfo,
  getFakeOsuUserUsername,
  getFakeUserBestScoreInfos,
} from '../../../mocks/Generators';
import {AppUser} from '../../../../src/main/data/repository/models/AppUser';
import {VkIdConverter} from '../../../../src/main/presentation/vk/VkIdConverter';
import {GetAppUserInfoUseCase} from '../../../../src/main/application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {FakeScoreSimulationApi} from '../../../mocks/data/http/ScoreSimulationApi';
import {ScoreSimulationsDaoImpl} from '../../../../src/main/data/dao/ScoreSimulationsDaoImpl';
import {CachedOsuUsersDaoImpl} from '../../../../src/main/data/dao/CachedOsuUsersDaoImpl';
import {OsuUserBestScoresDaoImpl} from '../../../../src/main/data/dao/OsuUserBestScoresDaoImpl';
import {GetUserBestPlaysUseCase} from '../../../../src/main/application/usecases/get_user_best_plays/GetUserBestPlaysUseCase';
import {
  BestPlay,
  OsuUserBestPlays,
} from '../../../../src/main/application/usecases/get_user_best_plays/GetUserBestPlaysResponse';
import {OsuUserBestScoreInfo} from '../../../../src/main/data/http/boundary/OsuUserBestScoreInfo';
import {ModAcronym} from '../../../../src/primitives/ModAcronym';
import {MainTextProcessor} from '../../../../src/main/presentation/common/arg_processing/MainTextProcessor';
import {
  MODE,
  MODS,
  OWN_COMMAND_PREFIX,
  QUANTITY,
  SERVER_PREFIX,
  START_POSITION,
  USERNAME,
} from '../../../../src/main/presentation/common/arg_processing/CommandArguments';
import {VkBeatmapCoversTable} from '../../../../src/main/presentation/data/repositories/VkBeatmapCoversRepository';

describe('UserBestPlays', function () {
  let tables: SqlDbTable[];
  let appUsers: AppUsersTable;
  let command: UserBestPlays;
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
    ];
    const mainTextProcessor = new MainTextProcessor(' ', "'", '\\');
    command = new UserBestPlays(
      mainTextProcessor,
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
          const matchResult = command.matchVkMessage(msg);
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
          const matchResult = command.matchVkMessage(msg);
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
      const viewParams = await command.process({
        vkUserId: -1,
        server: server,
        username: usernameInput,
        startPosition: 2,
        quantity: 3,
        mods: [
          {acronym: new ModAcronym('HD'), isOptional: true},
          {acronym: new ModAcronym('DT'), isOptional: false},
        ],
        mode: mode,
      });
      assert.strictEqual(viewParams.server, server);
      assert.strictEqual(viewParams.mode, mode);
      assert.strictEqual(viewParams.usernameInput, usernameInput);
      assert.strictEqual(viewParams.bestPlays, undefined);
    });
    it('should return OsuUserBestPlays as undefined when there is no AppUser associated with sender VK id', async function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.osu;
      const viewParams = await command.process({
        vkUserId: -1,
        server: server,
        username: undefined,
        startPosition: 2,
        quantity: 3,
        mods: [
          {acronym: new ModAcronym('HD'), isOptional: true},
          {acronym: new ModAcronym('DT'), isOptional: false},
        ],
        mode: mode,
      });
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
          const viewParams = await command.process({
            vkUserId: -1,
            server: server,
            username: username,
            startPosition: 2,
            quantity: 3,
            mods: [
              {acronym: new ModAcronym('HD'), isOptional: true},
              {acronym: new ModAcronym('DT'), isOptional: false},
            ],
            mode: undefined,
          });
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
          const viewParams = await command.process({
            vkUserId: -1,
            server: server,
            username: osuUser.username,
            startPosition: 2,
            quantity: 3,
            mods: [
              {acronym: new ModAcronym('HD'), isOptional: true},
              {acronym: new ModAcronym('DT'), isOptional: false},
            ],
            mode: OsuRuleset[mode],
          });
          assert.strictEqual(viewParams.server, server);
          assert.strictEqual(viewParams.mode, OsuRuleset[mode]);
          assert.strictEqual(viewParams.usernameInput, osuUser.username);
          assert.strictEqual(viewParams.bestPlays?.username, osuUser.username);
        }
      }
    });
    it('should return OsuUserBestPlays when there is AppUser associated with sender VK id', async function () {
      const appUser = existingAppAndOsuUser.appUser;
      const viewParams = await command.process({
        vkUserId: VkIdConverter.appUserIdToVkUserId(appUser.id),
        server: appUser.server,
        username: undefined,
        startPosition: 2,
        quantity: 3,
        mods: [
          {acronym: new ModAcronym('HD'), isOptional: true},
          {acronym: new ModAcronym('DT'), isOptional: false},
        ],
        mode: undefined,
      });
      assert.strictEqual(viewParams.server, appUser.server);
      assert.strictEqual(viewParams.mode, appUser.ruleset);
      assert.strictEqual(viewParams.usernameInput, undefined);
      assert.strictEqual(viewParams.bestPlays?.username, appUser.username);
      assert.notStrictEqual(viewParams.bestPlays?.plays.length, 0);
    });
  });
  describe('#createOutputMessage()', function () {
    it('should return "username not bound" message if username is not specified and there is no username bound to this VK account', function () {
      const server = OsuServer.Bancho;
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: undefined,
        usernameInput: undefined,
        bestPlays: undefined,
        coverAttachment: undefined,
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
        bestPlays: undefined,
        coverAttachment: undefined,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createUserNotFoundMessage(server, usernameInput).text
      );
    });
    it('should return "user plays" message if username is not specified but there is bound account info', function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.ctb;
      const usernameInput = undefined;
      const bestPlays: OsuUserBestPlays = {
        username: 'usrnm',
        plays: [scoreInfoToBestPlay(getFakeUserBestScoreInfos(123, mode)[0])],
      };
      const coverAttachment = undefined;
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: mode,
        usernameInput: usernameInput,
        bestPlays: bestPlays,
        coverAttachment: coverAttachment,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createBestPlaysMessage(bestPlays, server, mode, coverAttachment)
          .text
      );
    });
    it('should return "user plays" message if username is specified and there is corresponding account info', function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.ctb;
      const usernameInput = 'loremipsum';
      const bestPlays: OsuUserBestPlays = {
        username: 'usrnm',
        plays: [scoreInfoToBestPlay(getFakeUserBestScoreInfos(123, mode)[0])],
      };
      const coverAttachment = undefined;
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: mode,
        usernameInput: usernameInput,
        bestPlays: bestPlays,
        coverAttachment: coverAttachment,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createBestPlaysMessage(bestPlays, server, mode, coverAttachment)
          .text
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
