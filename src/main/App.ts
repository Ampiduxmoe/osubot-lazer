import {VK} from 'vk-io';
import {AppConfig, VkGroup} from './AppConfig';
import {VkClient} from './presentation/vk/VkClient';
import {GetUserRecentPlaysUseCase} from './application/usecases/get_user_recent_plays/GetUserRecentPlaysUseCase';
import {BanchoApi} from './data/http/bancho/BanchoApi';
import {OsuUsersDaoImpl} from './data/dao/OsuUsersDaoImpl';
import {GetOsuUserInfoUseCase} from './application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {UserRecentPlays} from './presentation/vk/commands/UserRecentPlays';
import {UserInfo} from './presentation/vk/commands/UserInfo';
import {SetUsername} from './presentation/vk/commands/SetUsername';
import {SetUsernameUseCase} from './application/usecases/set_username/SetUsernameUseCase';
import {AppUsersTable} from './data/persistence/db/tables/AppUsersTable';
import {SqliteDb} from './data/persistence/db/SqliteDb';
import {SqlDb} from './data/persistence/db/SqlDb';
import {GetAppUserInfoUseCase} from './application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuUserSnapshotsTable} from './data/persistence/db/tables/OsuUserSnapshotsTable';
import {AppUserApiRequestsCountsTable} from './data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {AppUsersDaoImpl} from './data/dao/AppUsersDaoImpl';
import {OsuUserRecentScoresDaoImpl} from './data/dao/OsuUserRecentScoresDaoImpl';
import {CachedOsuUsersDaoImpl} from './data/dao/CachedOsuUsersDaoImpl';
import {Help} from './presentation/vk/commands/Help';
import {ScoreSimulationsDaoImpl} from './data/dao/ScoreSimulationsDaoImpl';
import {OsutoolsSimulationApi} from './data/http/score_simulation/OsutoolsSImulationApi';
import {AppUserRecentApiRequestsDaoImpl} from './data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUserApiRequestsSummariesDaoImpl} from './data/dao/AppUserApiRequestsSummariesDaoImpl';
import {TimeWindowsTable} from './data/persistence/db/tables/TimeWindowsTable';
import {Timespan} from './primitives/Timespan';
import {ApiUsageSummary} from './presentation/vk/commands/ApiUsageSummary';
import {GetApiUsageSummaryUseCase} from './application/usecases/get_api_usage_summary/GetApiUsageSummaryUseCase';
import {UserBestPlays} from './presentation/vk/commands/UserBestPlays';
import {GetUserBestPlaysUseCase} from './application/usecases/get_user_best_plays/GetUserBestPlaysUseCase';
import {OsuUserBestScoresDaoImpl} from './data/dao/OsuUserBestScoresDaoImpl';
import {BanchoClient} from './data/http/bancho/client/BanchoClient';
import {SerializedObjectsTable} from './data/persistence/db/tables/SerializedObjectsTable';
import {OsuOauthAccessToken} from './data/http/bancho/OsuOauthAccessToken';
import {BeatmapInfo} from './presentation/vk/commands/BeatmapInfo';
import {GetBeatmapInfoUseCase} from './application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {OsuBeatmapsDaoImpl} from './data/dao/OsuBeatmapsDaoImpl';
import {GetBeatmapUsersBestScoresUseCase} from './application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {OsuBeatmapUserScoresDaoImpl} from './data/dao/OsuBeatmapUserScoresDaoImpl';
import {ChatLeaderboardOnMap} from './presentation/vk/commands/ChatLeaderboardOnMap';
import {UserBestPlaysOnMap} from './presentation/vk/commands/UserBestPlaysOnMap';
import {ChatLeaderboard} from './presentation/vk/commands/ChatLeaderboard';
import {MainTextProcessor} from './presentation/common/arg_processing/MainTextProcessor';
import {VkBeatmapCoversTable} from './presentation/data/repositories/VkBeatmapCoversRepository';
import axios from 'axios';
import {SqlDbTable} from './data/persistence/db/SqlDbTable';
import {VkChatLastBeatmapsTable} from './presentation/data/repositories/VkChatLastBeatmapsRepository';
import {Alias} from './presentation/vk/commands/Alias';
import {MainAliasProcessor} from './presentation/common/alias_processing/MainAliasProcessor';
import {
  AppUserCommandAliasesRepository,
  AppUserCommandAliasesTable,
} from './presentation/data/repositories/AppUserCommandAliasesRepository';
import {VkIdConverter} from './presentation/vk/VkIdConverter';
import {
  AnouncementsRepository,
  AnouncementsTable,
} from './presentation/data/repositories/AnouncementsRepository';
import {
  PastAnouncementsRepository,
  PastAnouncementsTable,
} from './presentation/data/repositories/PastAnouncementsRepository';
import {Anouncements} from './presentation/vk/commands/Anouncements';
import {wait} from './primitives/Promises';

export const APP_CODE_NAME = 'osubot-lazer';

export class App {
  readonly config: AppConfig;

  appDb: SqlDb;
  vkDb: SqlDb;

  currentVkGroup: VkGroup;
  vkClient: VkClient;

  startHandlers: (() => Promise<void>)[] = [];
  stopHandlers: (() => Promise<void>)[] = [];

  constructor(config: AppConfig) {
    this.config = config;
    const isProd = isProduction(/* fallbackValue = */ true);
    if (isProd) {
      console.log('Configuring as production configuration');
      this.currentVkGroup = config.vk.group;
      this.appDb = new SqliteDb('osu.db');
      this.vkDb = new SqliteDb('vk.db');
    } else {
      console.log('Configuring as development configuration');
      this.currentVkGroup = config.vk.group_dev;
      this.appDb = new SqliteDb('osu_dev.db');
      this.vkDb = new SqliteDb('vk_dev.db');
    }

    const appUsers = new AppUsersTable(this.appDb);
    const requestsCounts = new AppUserApiRequestsCountsTable(this.appDb);
    const serializedObjects = new SerializedObjectsTable(this.appDb);
    const osuUserSnapshots = new OsuUserSnapshotsTable(this.appDb);
    const timeWindows = new TimeWindowsTable(this.appDb);
    const aliases = new AppUserCommandAliasesTable(this.appDb);
    const anouncements = new AnouncementsTable(this.appDb);
    const pastAnouncements = new PastAnouncementsTable(this.appDb);

    const allDbTables = [
      appUsers,
      requestsCounts,
      serializedObjects,
      osuUserSnapshots,
      timeWindows,
      aliases,
      anouncements,
      pastAnouncements,
    ];

    const scoreSimulationApi = new OsutoolsSimulationApi(
      config.bot.score_simulation.endpoint_url,
      config.bot.score_simulation.default_timeout
    );

    const ensureTableIsInitialized = (
      table: SqlDbTable,
      timeout: number
    ): Promise<void> => {
      let isPromiseResolved = false;
      let isPromiseRejected = false;
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (!isPromiseResolved) {
            reject(
              Error(`Table ${table.tableName} initialization took too long`)
            );
            isPromiseRejected = true;
          }
        }, timeout);
        table.waitUntilInitialized().then(() => {
          if (!isPromiseRejected) {
            resolve();
            isPromiseResolved = true;
          }
        });
      });
    };
    const banchoOuath = config.osu.bancho.oauth;
    const banchoClient = new BanchoClient({
      ouathClientId: banchoOuath.id,
      oauthClientSecret: banchoOuath.secret,
      saveOuathToken: async token => {
        await ensureTableIsInitialized(serializedObjects, 10e3);
        await serializedObjects.save(
          token,
          OsuOauthAccessToken.SerializationDescriptor
        );
        console.log('Bancho OAuth token saved');
      },
      loadLatestOuathToken: async () => {
        await ensureTableIsInitialized(serializedObjects, 10e3);
        const token = await serializedObjects.validateAndGet(
          OsuOauthAccessToken.SerializationDescriptor
        );
        if (token === undefined) {
          return undefined;
        }
        console.log('Previous Bancho OAuth token loaded');
        return token;
      },
    });
    const banchoApi = new BanchoApi(banchoClient);

    const osuApiList = [banchoApi];

    const requestSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      requestsCounts,
      timeWindows
    );
    const recentApiRequestsDao = new AppUserRecentApiRequestsDaoImpl(
      requestSummariesDao
    );
    const osuUsersDao = new OsuUsersDaoImpl(
      osuApiList,
      osuUserSnapshots,
      recentApiRequestsDao
    );
    const appUsersDao = new AppUsersDaoImpl(appUsers);
    const recentScoresDao = new OsuUserRecentScoresDaoImpl(
      osuApiList,
      osuUserSnapshots,
      recentApiRequestsDao
    );
    const userBestScoresDao = new OsuUserBestScoresDaoImpl(
      osuApiList,
      osuUserSnapshots,
      recentApiRequestsDao
    );
    const osuBeatmapsDao = new OsuBeatmapsDaoImpl(
      osuApiList,
      recentApiRequestsDao
    );
    const osuBeatmapUserScoresDao = new OsuBeatmapUserScoresDaoImpl(
      osuApiList,
      recentApiRequestsDao
    );
    const scoreSimulationsDao = new ScoreSimulationsDaoImpl(scoreSimulationApi);
    const cachedOsuUsersDao = new CachedOsuUsersDaoImpl(osuUserSnapshots);

    const getOsuUserInfoUseCase = new GetOsuUserInfoUseCase(osuUsersDao);
    const getAppUserInfoUseCase = new GetAppUserInfoUseCase(appUsersDao);
    const setUsernameUseCase = new SetUsernameUseCase(appUsersDao, osuUsersDao);
    const getRecentPlaysUseCase = new GetUserRecentPlaysUseCase(
      recentScoresDao,
      scoreSimulationsDao,
      cachedOsuUsersDao,
      osuUsersDao
    );
    const getUserBestPlaysUseCase = new GetUserBestPlaysUseCase(
      userBestScoresDao,
      scoreSimulationsDao,
      cachedOsuUsersDao,
      osuUsersDao
    );
    const getApiUsageSummaryUseCase = new GetApiUsageSummaryUseCase(
      requestSummariesDao
    );
    const getBeatmapInfoUseCase = new GetBeatmapInfoUseCase(
      osuBeatmapsDao,
      scoreSimulationsDao
    );
    const getBeatmapUsersBestScoresUseCase =
      new GetBeatmapUsersBestScoresUseCase(
        osuBeatmapsDao,
        osuBeatmapUserScoresDao,
        scoreSimulationsDao,
        cachedOsuUsersDao,
        osuUsersDao
      );

    this.vkClient = this.createVkClient({
      vkDb: this.vkDb,
      group: this.currentVkGroup,

      getOsuUserInfoUseCase: getOsuUserInfoUseCase,
      getAppUserInfoUseCase: getAppUserInfoUseCase,
      setUsernameUseCase: setUsernameUseCase,
      getRecentPlaysUseCase: getRecentPlaysUseCase,
      getUserBestPlaysUseCase: getUserBestPlaysUseCase,
      getApiUsageSummaryUseCase: getApiUsageSummaryUseCase,
      getBeatmapInfoUseCase: getBeatmapInfoUseCase,
      getBeatmapUsersBestScoresUseCase: getBeatmapUsersBestScoresUseCase,

      appUserCommandAliasesRepository: aliases,
      anouncementsRepository: anouncements,
      pastAnouncementsRepository: pastAnouncements,
    });

    this.startHandlers.push(async () => {
      console.log('Started initializing tables');
      const initPromises = allDbTables.map(t => t.init());
      await Promise.all(initPromises);
      console.log('All tables initialized successfully');
    });
    this.startHandlers.push(async () => {
      recentApiRequestsDao.startRequestsCleanups(
        new Timespan().addMinutes(1).totalMiliseconds()
      );
      scoreSimulationsDao.startApiHealthChecks(
        config.bot.score_simulation.default_timeout
      );
    });
    this.stopHandlers.push(async () => {
      recentApiRequestsDao.stopRequestsCleanups();
      scoreSimulationsDao.stopApiHealthChecks();
      await recentApiRequestsDao.cleanUp();
    });
  }

  createVkClient(params: VkClientCreationParams): VkClient {
    const {vkDb} = params;
    const {group} = params;

    const {getOsuUserInfoUseCase} = params;
    const {getAppUserInfoUseCase} = params;
    const {setUsernameUseCase} = params;
    const {getRecentPlaysUseCase} = params;
    const {getUserBestPlaysUseCase} = params;
    const {getApiUsageSummaryUseCase} = params;
    const {getBeatmapInfoUseCase} = params;
    const {getBeatmapUsersBestScoresUseCase} = params;

    const {appUserCommandAliasesRepository} = params;
    const {anouncementsRepository} = params;
    const {pastAnouncementsRepository} = params;

    const vk = new VK({
      pollingGroupId: group.id,
      token: group.token,
    });
    const vkClient = new VkClient(vk);

    const mainTextProcessor = new MainTextProcessor(' ', "'", '\\');

    const getConversationMembers = async (
      chatId: number
    ): Promise<number[]> => {
      const chatMembers = await vk.api.messages.getConversationMembers({
        peer_id: 2e9 + chatId,
      });
      return chatMembers.profiles.map(x => x.id);
    };
    const sendToAllPeers = async (text: string): Promise<number[]> => {
      const basePeerIds: number[] = [];
      for (let offset = 0, fetchedAll = false; !fetchedAll; ) {
        const conversations = await vk.api.messages.getConversations({
          offset: offset,
          count: 200,
          filter: 'all',
          group_id: group.id,
        });
        basePeerIds.push(
          ...conversations.items.map(x => x.conversation.peer.id)
        );
        if (conversations.items.length < 200) {
          fetchedAll = true;
        } else {
          offset += 200;
          await wait(200);
        }
      }
      const getNextPeerIdBatch = (() => {
        let nextChatId = 2e9 + 1;
        let nextOffset = 0;
        const batchSize = 100;
        return () => {
          const startOffset = nextOffset;
          const endOffset = startOffset + batchSize;
          const ids = basePeerIds.slice(startOffset, endOffset);
          if (ids.length < batchSize) {
            ids.push(
              ...Array.from({length: batchSize - ids.length}).map(
                (_, i) => nextChatId + i
              )
            );
            nextChatId += batchSize - ids.length;
          }
          nextOffset += batchSize;
          return ids;
        };
      })();
      let warningAlertJob: NodeJS.Timeout | undefined = undefined;
      const sentIds: number[] = [];
      for (let sentToAll = false; !sentToAll; ) {
        const response = await vk.api.messages.send({
          message: text,
          peer_ids: getNextPeerIdBatch(),
          random_id: Math.ceil(Math.random() * 1e6),
        });
        sentIds.push(
          ...response
            .map(x => {
              if (x.error === undefined) {
                return x.peer_id;
              }
              if (x.error.code === 917) {
                sentToAll = true;
              }
              return undefined;
            })
            .filter(peerId => peerId !== undefined)
        );
        if (!sentToAll) {
          await wait(500);
          const lastSentId = sentIds[sentIds.length - 1];
          const chatIdWarningThreshold = 5e3;
          if (lastSentId > 2e9 + chatIdWarningThreshold) {
            // Do we really have (or had) the bot in 5000+ group chats
            // or are we just unable to exit this loop?
            warningAlertJob ??= setInterval(() => {
              const warningText =
                `Chat ID exceeded ${chatIdWarningThreshold} ` +
                'when sending to all VK peers ' +
                `(last peer ID was ${lastSentId})`;
              console.warn(warningText);
              vk.api.messages.send({
                message: warningText,
                peer_id: group.owner,
                random_id: Math.ceil(Math.random() * 1e6),
              });
            }, 60e3);
          }
        } else {
          if (warningAlertJob !== undefined) {
            clearInterval(warningAlertJob);
            warningAlertJob = undefined;
          }
        }
      }
      return sentIds;
    };

    const fetchArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
      return (
        await axios.get(url, {
          responseType: 'arraybuffer',
        })
      ).data;
    };
    const uploadImageToVk = async (buffer: Buffer): Promise<string> => {
      return (
        await vk.upload.messagePhoto({
          source: {
            value: buffer,
          },
        })
      ).toString();
    };
    const vkBeatmapCovers = new VkBeatmapCoversTable(
      vkDb,
      fetchArrayBuffer,
      uploadImageToVk,
      true
    );
    const vkChatLastBeatmaps = new VkChatLastBeatmapsTable(vkDb);
    const aliasProcessor = new MainAliasProcessor();

    const publicCommands = [
      new SetUsername(mainTextProcessor, setUsernameUseCase),
      new UserInfo(
        mainTextProcessor,
        getOsuUserInfoUseCase,
        getAppUserInfoUseCase
      ),
      new BeatmapInfo(
        mainTextProcessor,
        getBeatmapInfoUseCase,
        vkBeatmapCovers,
        vkChatLastBeatmaps
      ),
      new UserRecentPlays(
        mainTextProcessor,
        getRecentPlaysUseCase,
        getAppUserInfoUseCase,
        vkBeatmapCovers,
        vkChatLastBeatmaps
      ),
      new UserBestPlays(
        mainTextProcessor,
        getUserBestPlaysUseCase,
        getAppUserInfoUseCase,
        vkBeatmapCovers,
        vkChatLastBeatmaps
      ),
      new UserBestPlaysOnMap(
        mainTextProcessor,
        getBeatmapUsersBestScoresUseCase,
        getAppUserInfoUseCase,
        vkBeatmapCovers,
        vkChatLastBeatmaps
      ),
      new ChatLeaderboard(
        mainTextProcessor,
        getConversationMembers,
        getOsuUserInfoUseCase,
        getAppUserInfoUseCase
      ),
      new ChatLeaderboardOnMap(
        mainTextProcessor,
        getConversationMembers,
        getBeatmapUsersBestScoresUseCase,
        getAppUserInfoUseCase,
        vkChatLastBeatmaps
      ),
      new Alias(
        mainTextProcessor,
        appUserCommandAliasesRepository,
        aliasProcessor
      ),
    ];
    for (const command of publicCommands) {
      command.link(publicCommands);
    }
    const adminCommands = [
      new ApiUsageSummary(
        [group.owner],
        mainTextProcessor,
        getApiUsageSummaryUseCase
      ),
      new Anouncements(
        [group.owner],
        mainTextProcessor,
        anouncementsRepository,
        pastAnouncementsRepository,
        sendToAllPeers
      ),
    ];
    const helpCommand = new Help(mainTextProcessor, publicCommands);
    vkClient.addCommands([helpCommand, ...publicCommands]);
    vkClient.addCommands(adminCommands);

    const initActions: (() => Promise<void>)[] = [
      () => vkBeatmapCovers.createTable(),
      () => vkChatLastBeatmaps.createTable(),
    ];
    vkClient.initActions.push(...initActions);

    vkClient.preprocessors.push(async ctx => {
      if (!ctx.hasText || ctx.text === undefined) {
        return ctx;
      }
      const appUserId = VkIdConverter.vkUserIdToAppUserId(ctx.senderId);
      const userAliases = await appUserCommandAliasesRepository.get({
        appUserId: appUserId,
      });
      let aliasMatchFound = false;
      let bestAliasMatch: undefined | {pattern: string; replacement: string} = {
        pattern: '',
        replacement: '',
      };
      for (const alias of userAliases?.aliases ?? []) {
        if (aliasProcessor.match(ctx.text, alias.pattern)) {
          if (alias.pattern.length > (bestAliasMatch.pattern.length ?? 0)) {
            aliasMatchFound = true;
            bestAliasMatch = alias;
          }
        }
      }
      if (aliasMatchFound) {
        ctx.text = aliasProcessor.process(
          ctx.text,
          bestAliasMatch.pattern,
          bestAliasMatch.replacement
        );
      }
      return ctx;
    });

    return vkClient;
  }

  async start(): Promise<void> {
    console.log('App starting...');
    for (const startHandler of this.startHandlers) {
      await startHandler();
    }
    await this.vkClient.start();
    console.log('App started!');
  }

  async stop(): Promise<void> {
    console.log('App stopping...');
    await this.vkClient.stop();
    for (const stopHandler of this.stopHandlers) {
      await stopHandler();
    }
    console.log('Stopped');
  }
}

/**
 * Whether process is running in production,
 * determined by NODE_ENV environment variable.
 * If NODE_ENV is not specified, returns {@link fallbackValue}
 */
function isProduction(fallbackValue: boolean): boolean {
  switch (process.env.NODE_ENV) {
    case 'development':
      return false;
    case 'production':
      return true;
    default:
      return fallbackValue;
  }
}

type VkClientCreationParams = {
  vkDb: SqlDb;
  group: VkGroup;

  getOsuUserInfoUseCase: GetOsuUserInfoUseCase;
  getAppUserInfoUseCase: GetAppUserInfoUseCase;
  setUsernameUseCase: SetUsernameUseCase;
  getRecentPlaysUseCase: GetUserRecentPlaysUseCase;
  getUserBestPlaysUseCase: GetUserBestPlaysUseCase;
  getApiUsageSummaryUseCase: GetApiUsageSummaryUseCase;
  getBeatmapInfoUseCase: GetBeatmapInfoUseCase;
  getBeatmapUsersBestScoresUseCase: GetBeatmapUsersBestScoresUseCase;

  appUserCommandAliasesRepository: AppUserCommandAliasesRepository;
  anouncementsRepository: AnouncementsRepository;
  pastAnouncementsRepository: PastAnouncementsRepository;
};
