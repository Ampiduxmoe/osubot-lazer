/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {UserRecentPlays} from '../../src/main/presentation/vk/commands/UserRecentPlays';
import {
  createWithOnlyText,
  createWithPayload,
} from '../mocks/presentation/VkMessageContext';
import {VkMessageContext} from '../../src/main/presentation/vk/VkMessageContext';
import {SERVERS} from '../../src/main/presentation/common/OsuServers';
import {APP_CODE_NAME} from '../../src/main/App';
import {OsuServer} from '../../src/primitives/OsuServer';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../src/primitives/OsuRuleset';
import {FakeBanchoApi} from '../mocks/data/raw/http/BanchoApi';
import {SqliteDb} from '../../src/main/data/raw/db/SqliteDb';
import {OsuUserSnapshotsImpl} from '../../src/main/data/raw/db/tables/OsuUserSnapshots';
import {AppUserApiRequestsCountsImpl} from '../../src/main/data/raw/db/tables/AppUserApiRequestsCounts';
import {TimeWindowsImpl} from '../../src/main/data/raw/db/tables/TimeWindows';
import {AppUserApiRequestsSummariesDaoImpl} from '../../src/main/data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserRecentApiRequestsDaoImpl} from '../../src/main/data/dao/AppUserRecentApiRequestsDaoImpl';
import {OsuUsersDaoImpl} from '../../src/main/data/dao/OsuUsersDaoImpl';
import {
  AppUsers,
  AppUsersImpl,
} from '../../src/main/data/raw/db/tables/AppUsers';
import {AppUsersDaoImpl} from '../../src/main/data/dao/AppUsersDaoImpl';
import {SqlDbTable} from '../../src/main/data/raw/db/SqlDbTable';
import {
  getFakeOsuUserInfo,
  getFakeOsuUserUsername,
  getFakeRecentScoreInfos,
} from '../mocks/Generators';
import {AppUser} from '../../src/main/data/raw/db/entities/AppUser';
import {VkIdConverter} from '../../src/main/presentation/vk/VkIdConverter';
import {GetAppUserInfoUseCase} from '../../src/main/domain/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuRecentScoresDaoImpl} from '../../src/main/data/dao/OsuRecentScoresDaoImpl';
import {FakeScoreSimulationApi} from '../mocks/data/raw/http/ScoreSimulationApi';
import {ScoreSimulationsDaoImpl} from '../../src/main/data/dao/ScoreSimulationsDaoImpl';
import {GetRecentPlaysUseCase} from '../../src/main/domain/usecases/get_recent_plays/GetRecentPlaysUseCase';
import {CachedOsuUsersDaoImpl} from '../../src/main/data/dao/CachedOsuUsersDaoImpl';
import {
  OsuUserRecentPlays,
  RecentPlay,
} from '../../src/main/domain/usecases/get_recent_plays/GetRecentPlaysResponse';
import {RecentScoreInfo} from '../../src/main/data/raw/http/boundary/RecentScoreInfo';

describe('UserRecentPlays', function () {
  let tables: SqlDbTable<object, object>[];
  let appUsers: AppUsers;
  let command: UserRecentPlays;
  {
    const apis = [new FakeBanchoApi()];
    const db = new SqliteDb(':memory:');
    const osuUserSnapshots = new OsuUserSnapshotsImpl(db);
    const appUserApiRequestsCounts = new AppUserApiRequestsCountsImpl(db);
    const timeWindows = new TimeWindowsImpl(db);
    appUsers = new AppUsersImpl(db);
    const requestsSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      appUserApiRequestsCounts,
      timeWindows
    );
    const recentApiRequestsDao = new AppUserRecentApiRequestsDaoImpl(
      requestsSummariesDao
    );
    const recentScoresDao = new OsuRecentScoresDaoImpl(
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

    const getRecentPlaysUseCase = new GetRecentPlaysUseCase(
      recentScoresDao,
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
    ];
    command = new UserRecentPlays(getRecentPlaysUseCase, getAppUserInfoUseCase);
  }

  const exampleAppUser: AppUser = {
    id: VkIdConverter.vkUserIdToAppUserId(123123),
    server: OsuServer.Bancho,
    osu_id: 123,
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
          const goodText = `${serverAndPrefix.prefix} ${prefix} ${username} \\2 :5 +(hd)dt mode=osu`;
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
          const goodText = `${serverAndPrefix.prefix} ${prefix} ${username} \\3 :6 +(hd)hr mode=osu`;
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
    it('should return OsuUserRecentPlays as undefined when there is no user with specified username', async function () {
      const usernameInput = 'alskdjfhg';
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.osu;
      const passesOnly = false;
      const viewParams = await command.process({
        vkUserId: -1,
        server: server,
        passesOnly: passesOnly,
        username: usernameInput,
        startPosition: 2,
        quantity: 3,
        mods: [
          {acronym: 'HD', isOptional: true},
          {acronym: 'DT', isOptional: false},
        ],
        mode: mode,
      });
      assert.strictEqual(viewParams.server, server);
      assert.strictEqual(viewParams.mode, mode);
      assert.strictEqual(viewParams.passesOnly, passesOnly);
      assert.strictEqual(viewParams.usernameInput, usernameInput);
      assert.strictEqual(viewParams.recentPlays, undefined);
    });
    it('should return OsuUserRecentPlays as undefined when there is no AppUser associated with sender VK id', async function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.osu;
      const passesOnly = false;
      const viewParams = await command.process({
        vkUserId: -1,
        server: server,
        passesOnly: passesOnly,
        username: undefined,
        startPosition: 2,
        quantity: 3,
        mods: [
          {acronym: 'HD', isOptional: true},
          {acronym: 'DT', isOptional: false},
        ],
        mode: mode,
      });
      assert.strictEqual(viewParams.server, server);
      assert.strictEqual(viewParams.mode, mode);
      assert.strictEqual(viewParams.passesOnly, passesOnly);
      assert.strictEqual(viewParams.usernameInput, undefined);
      assert.strictEqual(viewParams.recentPlays, undefined);
    });
    it('should return OsuUserRecentPlays when there is user with specified username', async function () {
      const server = OsuServer.Bancho;
      const osuUsers = [1, 3, 5, 7, 9].map(n =>
        getFakeOsuUserInfo(n, undefined)
      );
      const passesOnly = false;
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
            passesOnly: passesOnly,
            username: username,
            startPosition: 2,
            quantity: 3,
            mods: [
              {acronym: 'HD', isOptional: true},
              {acronym: 'DT', isOptional: false},
            ],
            mode: undefined,
          });
          assert.strictEqual(viewParams.server, server);
          assert.strictEqual(viewParams.mode, osuUser.preferredMode);
          assert.strictEqual(viewParams.passesOnly, passesOnly);
          assert.strictEqual(viewParams.usernameInput, username);
          assert.notStrictEqual(viewParams.recentPlays?.plays.length, 0);
        }
      }
    });
    it('should correctly return OsuUserRecentPlays for specified mode', async function () {
      const server = OsuServer.Bancho;
      const passesOnly = true;
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
            passesOnly: passesOnly,
            username: osuUser.username,
            startPosition: 2,
            quantity: 3,
            mods: [
              {acronym: 'HD', isOptional: true},
              {acronym: 'DT', isOptional: false},
            ],
            mode: OsuRuleset[mode],
          });
          assert.strictEqual(viewParams.server, server);
          assert.strictEqual(viewParams.mode, OsuRuleset[mode]);
          assert.strictEqual(viewParams.passesOnly, passesOnly);
          assert.strictEqual(viewParams.usernameInput, osuUser.username);
          assert.strictEqual(
            viewParams.recentPlays?.username,
            osuUser.username
          );
        }
      }
    });
    it('should return OsuUserRecentPlays when there is AppUser associated with sender VK id', async function () {
      const appUser = existingAppAndOsuUser.appUser;
      const passesOnly = false;
      const viewParams = await command.process({
        vkUserId: VkIdConverter.appUserIdToVkUserId(appUser.id),
        server: appUser.server,
        passesOnly: passesOnly,
        username: undefined,
        startPosition: 2,
        quantity: 3,
        mods: [
          {acronym: 'HD', isOptional: true},
          {acronym: 'DT', isOptional: false},
        ],
        mode: undefined,
      });
      assert.strictEqual(viewParams.server, appUser.server);
      assert.strictEqual(viewParams.mode, appUser.ruleset);
      assert.strictEqual(viewParams.passesOnly, passesOnly);
      assert.strictEqual(viewParams.usernameInput, undefined);
      assert.strictEqual(viewParams.recentPlays?.username, appUser.username);
      assert.notStrictEqual(viewParams.recentPlays?.plays.length, 0);
    });
  });
  describe('#createOutputMessage()', function () {
    it('should return "username not bound" message if username is not specified and there is no username bound to this VK account', function () {
      const server = OsuServer.Bancho;
      const passesOnly = true;
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: undefined,
        passesOnly: passesOnly,
        usernameInput: undefined,
        recentPlays: undefined,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createUsernameNotBoundMessage(server).text
      );
    });
    it('should return "user not found" message if username is specified and there is no information about corresponding user', function () {
      const server = OsuServer.Bancho;
      const passesOnly = true;
      const usernameInput = 'loremipsum';
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: undefined,
        passesOnly: passesOnly,
        usernameInput: usernameInput,
        recentPlays: undefined,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createUserNotFoundMessage(server, usernameInput).text
      );
    });
    it('should return "user plays" message if username is not specified but there is bound account info', function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.ctb;
      const passesOnly = false;
      const usernameInput = undefined;
      const recentPlays: OsuUserRecentPlays = {
        username: 'usrnm',
        plays: [scoreInfoToRecentPlay(getFakeRecentScoreInfos(123, mode)[0])],
      };
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: mode,
        passesOnly: passesOnly,
        usernameInput: usernameInput,
        recentPlays: recentPlays,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createRecentPlaysMessage(recentPlays, server, mode, passesOnly)
          .text
      );
    });
    it('should return "user plays" message if username is specified and there is corresponding account info', function () {
      const server = OsuServer.Bancho;
      const mode = OsuRuleset.ctb;
      const passesOnly = false;
      const usernameInput = 'loremipsum';
      const recentPlays: OsuUserRecentPlays = {
        username: 'usrnm',
        plays: [scoreInfoToRecentPlay(getFakeRecentScoreInfos(123, mode)[0])],
      };
      const outputMessage = command.createOutputMessage({
        server: server,
        mode: mode,
        passesOnly: passesOnly,
        usernameInput: usernameInput,
        recentPlays: recentPlays,
      });
      assert.strictEqual(
        outputMessage.text,
        command.createRecentPlaysMessage(recentPlays, server, mode, passesOnly)
          .text
      );
    });
  });
});

function scoreInfoToRecentPlay(recentScoreInfo: RecentScoreInfo): RecentPlay {
  const s = recentScoreInfo;
  return {
    absolutePosition: 100,
    beatmapset: {
      status: 'Ranked',
      artist: s.beatmapset.artist,
      title: s.beatmapset.title,
      creator: s.beatmapset.creator,
    },
    beatmap: {
      difficultyName: s.beatmap.version,
      totalLength: s.beatmap.totalLength,
      drainLength: s.beatmap.hitLength,
      bpm: s.beatmap.bpm,
      stars: s.beatmap.difficultyRating,
      ar: s.beatmap.ar,
      cs: s.beatmap.cs,
      od: s.beatmap.od,
      hp: s.beatmap.hp,
      maxCombo: 100,
      url: s.beatmap.url,
      countCircles: s.beatmap.countCircles,
      countSliders: s.beatmap.countSliders,
      countSpinners: s.beatmap.countSpinners,
    },
    mods: s.mods,
    stars: s.beatmap.difficultyRating,
    ar: s.beatmap.ar,
    cs: s.beatmap.cs,
    od: s.beatmap.od,
    hp: s.beatmap.hp,
    passed: s.passed,
    totalScore: s.totalScore,
    combo: s.maxCombo,
    accuracy: s.accuracy,
    pp: {
      value: s.pp ?? undefined,
      ifFc: undefined,
      ifSs: undefined,
    },
    statistics: {
      countGreat: s.statistics.great ?? 0,
      countOk: s.statistics.ok ?? 0,
      countMeh: s.statistics.meh ?? 0,
      countMiss: s.statistics.miss ?? 0,
    },
    grade: s.rank,
  };
}
