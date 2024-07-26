import axios from 'axios';
import {AttachmentType, VK} from 'vk-io';
import {AppConfig, VkGroup} from './AppConfig';
import {GetApiUsageSummaryUseCase} from './application/usecases/get_api_usage_summary/GetApiUsageSummaryUseCase';
import {GetAppUserInfoUseCase} from './application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {GetBeatmapInfoUseCase} from './application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {GetBeatmapUsersBestScoresUseCase} from './application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {GetOsuUserInfoUseCase} from './application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {GetUserBestPlaysUseCase} from './application/usecases/get_user_best_plays/GetUserBestPlaysUseCase';
import {GetUserRecentPlaysUseCase} from './application/usecases/get_user_recent_plays/GetUserRecentPlaysUseCase';
import {SetUsernameUseCase} from './application/usecases/set_username/SetUsernameUseCase';
import {AppUserApiRequestsSummariesDaoImpl} from './data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserRecentApiRequestsDaoImpl} from './data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUsersDaoImpl} from './data/dao/AppUsersDaoImpl';
import {CachedOsuUsersDaoImpl} from './data/dao/CachedOsuUsersDaoImpl';
import {OsuBeatmapsDaoImpl} from './data/dao/OsuBeatmapsDaoImpl';
import {OsuBeatmapUserScoresDaoImpl} from './data/dao/OsuBeatmapUserScoresDaoImpl';
import {OsuUserBestScoresDaoImpl} from './data/dao/OsuUserBestScoresDaoImpl';
import {OsuUserRecentScoresDaoImpl} from './data/dao/OsuUserRecentScoresDaoImpl';
import {OsuUsersDaoImpl} from './data/dao/OsuUsersDaoImpl';
import {ScoreSimulationsDaoImpl} from './data/dao/ScoreSimulationsDaoImpl';
import {BanchoApi} from './data/http/bancho/BanchoApi';
import {BanchoClient} from './data/http/bancho/client/BanchoClient';
import {OsuOauthAccessToken} from './data/http/bancho/OsuOauthAccessToken';
import {OsutoolsSimulationApi} from './data/http/score_simulation/OsutoolsSImulationApi';
import {SqlDb} from './data/persistence/db/SqlDb';
import {SqlDbTable} from './data/persistence/db/SqlDbTable';
import {SqliteDb} from './data/persistence/db/SqliteDb';
import {AppUserApiRequestsCountsTable} from './data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {AppUsersTable} from './data/persistence/db/tables/AppUsersTable';
import {OsuUserSnapshotsTable} from './data/persistence/db/tables/OsuUserSnapshotsTable';
import {SerializedObjectsTable} from './data/persistence/db/tables/SerializedObjectsTable';
import {TimeWindowsTable} from './data/persistence/db/tables/TimeWindowsTable';
import {
  GetContextualBeatmapIds,
  GetInitiatorAppUserId,
  GetLastSeenBeatmapId,
  GetLocalAppUserIds,
  GetTargetAppUserId,
  SaveLastSeenBeatmapId,
} from './presentation/commands/common/Signatures';
import {MainAliasProcessor} from './presentation/common/alias_processing/MainAliasProcessor';
import {MainTextProcessor} from './presentation/common/arg_processing/MainTextProcessor';
import {
  AnouncementsRepository,
  AnouncementsTable,
} from './presentation/data/repositories/AnouncementsRepository';
import {
  AppUserCommandAliasesRepository,
  AppUserCommandAliasesTable,
} from './presentation/data/repositories/AppUserCommandAliasesRepository';
import {
  PastAnouncementsRepository,
  PastAnouncementsTable,
} from './presentation/data/repositories/PastAnouncementsRepository';
import {VkBeatmapCoversTable} from './presentation/data/repositories/VkBeatmapCoversRepository';
import {VkChatLastBeatmapsTable} from './presentation/data/repositories/VkChatLastBeatmapsRepository';
import {AliasVk} from './presentation/vk/commands/AliasVk';
import {AnouncementsVk} from './presentation/vk/commands/AnouncementsVk';
import {ApiUsageSummaryVk} from './presentation/vk/commands/ApiUsageSummaryVk';
import {BeatmapInfoVk} from './presentation/vk/commands/BeatmapInfoVk';
import {BeatmapMenuVk} from './presentation/vk/commands/BeatmapMenuVk';
import {ChatLeaderboardOnMapVk} from './presentation/vk/commands/ChatLeaderboardOnMapVk';
import {ChatLeaderboardVk} from './presentation/vk/commands/ChatLeaderboardVk';
import {HelpVk} from './presentation/vk/commands/HelpVk';
import {SetUsernameVk} from './presentation/vk/commands/SetUsernameVk';
import {UserBestPlaysOnMapVk} from './presentation/vk/commands/UserBestPlaysOnMapVk';
import {UserBestPlaysVk} from './presentation/vk/commands/UserBestPlaysVk';
import {UserInfoVk} from './presentation/vk/commands/UserInfoVk';
import {UserRecentPlaysVk} from './presentation/vk/commands/UserRecentPlaysVk';
import {VkClient} from './presentation/vk/VkClient';
import {VkIdConverter} from './presentation/vk/VkIdConverter';
import {VkMessageContext} from './presentation/vk/VkMessageContext';
import {OsuServer} from './primitives/OsuServer';
import {wait} from './primitives/Promises';
import {Timespan} from './primitives/Timespan';

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
    const isProd = isProduction({fallbackValue: true});
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
    const vkClient = new VkClient(vk, [group.owner]);

    const mainTextProcessor = new MainTextProcessor(' ', "'", '\\');

    const getInitiatorAppUserId: GetInitiatorAppUserId<
      VkMessageContext
    > = ctx => {
      return VkIdConverter.vkUserIdToAppUserId(ctx.senderId);
    };
    const getTargetAppUserId: GetTargetAppUserId<VkMessageContext> = (
      ctx,
      options
    ) => {
      return VkIdConverter.vkUserIdToAppUserId(
        options.canTargetOthersAsNonAdmin || ctx.senderId === group.owner
          ? ctx.replyMessage?.senderId ?? ctx.senderId
          : ctx.senderId
      );
    };
    const getLocalAppUserIds: GetLocalAppUserIds<
      VkMessageContext
    > = async ctx => {
      if (ctx.chatId === undefined) {
        return [VkIdConverter.vkUserIdToAppUserId(ctx.senderId)];
      }
      const chatMembers = await vk.api.messages.getConversationMembers({
        peer_id: 2e9 + ctx.chatId,
      });
      return chatMembers.profiles.map(x =>
        VkIdConverter.vkUserIdToAppUserId(x.id)
      );
    };
    const sendToAllPeers = async (text: string): Promise<string[]> => {
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
      return sentIds.map(id => (id > 2e9 ? `c:${id - 2e9}` : `p:${id}`));
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
    const getLastSeenBeatmapId: GetLastSeenBeatmapId<VkMessageContext> = async (
      ctx,
      server
    ) => {
      return (
        await vkChatLastBeatmaps.get({peerId: ctx.peerId, server: server})
      )?.beatmapId;
    };
    const saveLastSeenBeatmapId: SaveLastSeenBeatmapId<VkMessageContext> = (
      ctx,
      server,
      beatmapId
    ) => {
      return vkChatLastBeatmaps.save(ctx.peerId, server, beatmapId);
    };
    const getContextualBeatmapIds: GetContextualBeatmapIds<VkMessageContext> =
      (() => {
        const beatmapLinkRegexes: Record<keyof typeof OsuServer, RegExp[]> = {
          Bancho: [
            /(https?:\/\/)?osu\.ppy\.sh\/b\/(?<ID>\d+)\/?/i,
            /(https?:\/\/)?osu\.ppy\.sh\/beatmaps\/(?<ID>\d+)\/?/i,
            /(https?:\/\/)?osu\.ppy\.sh\/beatmapsets\/(\d+)#(osu|taiko|fruits|mania)\/(?<ID>\d+)\/?/i,
          ],
        };
        return ctx => {
          const allMatches: {offset: number; server: OsuServer; id: number}[] =
            [];
          const texts: string[] = [];
          for (const attachment of ctx.getAttachments(AttachmentType.LINK)) {
            texts.push(attachment.url);
          }
          if (ctx.replyMessage !== undefined) {
            if (ctx.replyMessage.text !== undefined) {
              texts.push(ctx.replyMessage.text);
            }
            for (const attachment of ctx.replyMessage.getAttachments(
              AttachmentType.LINK
            )) {
              texts.push(attachment.url);
            }
          }

          for (const text of texts) {
            const textMatches: {
              offset: number;
              server: OsuServer;
              id: number;
            }[] = [];
            for (const server in beatmapLinkRegexes) {
              const serverAsKey = server as keyof typeof OsuServer;
              const serverRegexes = beatmapLinkRegexes[serverAsKey];
              for (const regex of serverRegexes) {
                const matches = regex.exec(text);
                const idString = matches?.groups?.ID;
                if (idString !== undefined) {
                  textMatches.push({
                    offset: matches!.index,
                    server: OsuServer[serverAsKey],
                    id: parseInt(idString),
                  });
                }
              }
            }
            allMatches.push(...textMatches.sort((a, b) => a.offset - b.offset));
          }
          return allMatches;
        };
      })();
    const aliasProcessor = new MainAliasProcessor();

    const publicCommands = [
      new SetUsernameVk(
        mainTextProcessor,
        getTargetAppUserId,
        setUsernameUseCase
      ),
      new UserInfoVk(
        mainTextProcessor,
        getInitiatorAppUserId,
        getTargetAppUserId,
        getOsuUserInfoUseCase,
        getAppUserInfoUseCase
      ),
      new BeatmapInfoVk(
        mainTextProcessor,
        getInitiatorAppUserId,
        getContextualBeatmapIds,
        getLastSeenBeatmapId,
        saveLastSeenBeatmapId,
        getBeatmapInfoUseCase,
        vkBeatmapCovers
      ),
      new UserRecentPlaysVk(
        mainTextProcessor,
        getInitiatorAppUserId,
        getTargetAppUserId,
        saveLastSeenBeatmapId,
        getRecentPlaysUseCase,
        getAppUserInfoUseCase,
        vkBeatmapCovers
      ),
      new UserBestPlaysVk(
        mainTextProcessor,
        getInitiatorAppUserId,
        getTargetAppUserId,
        saveLastSeenBeatmapId,
        getUserBestPlaysUseCase,
        getAppUserInfoUseCase,
        vkBeatmapCovers
      ),
      new UserBestPlaysOnMapVk(
        mainTextProcessor,
        getInitiatorAppUserId,
        getTargetAppUserId,
        getContextualBeatmapIds,
        getLastSeenBeatmapId,
        saveLastSeenBeatmapId,
        getBeatmapUsersBestScoresUseCase,
        getAppUserInfoUseCase,
        vkBeatmapCovers
      ),
      new ChatLeaderboardVk(
        mainTextProcessor,
        getInitiatorAppUserId,
        getLocalAppUserIds,
        getOsuUserInfoUseCase,
        getAppUserInfoUseCase
      ),
      new ChatLeaderboardOnMapVk(
        mainTextProcessor,
        getInitiatorAppUserId,
        getLocalAppUserIds,
        getContextualBeatmapIds,
        getLastSeenBeatmapId,
        saveLastSeenBeatmapId,
        getBeatmapUsersBestScoresUseCase,
        getAppUserInfoUseCase
      ),
      new AliasVk(
        mainTextProcessor,
        getTargetAppUserId,
        appUserCommandAliasesRepository,
        aliasProcessor
      ),
    ];
    const beatmapMenuCommand = new BeatmapMenuVk(mainTextProcessor);
    for (const command of [...publicCommands, beatmapMenuCommand]) {
      command.link(publicCommands);
    }
    const adminCommands = [
      new ApiUsageSummaryVk(mainTextProcessor, getApiUsageSummaryUseCase),
      new AnouncementsVk(
        mainTextProcessor,
        anouncementsRepository,
        pastAnouncementsRepository,
        sendToAllPeers
      ),
    ];
    const helpCommand = new HelpVk(mainTextProcessor, publicCommands);
    vkClient.publicCommands.push(
      helpCommand,
      ...publicCommands,
      beatmapMenuCommand
    );
    vkClient.adminCommands.push(...adminCommands);

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

function isProduction({fallbackValue}: {fallbackValue: boolean}): boolean {
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
