import {APIError, AttachmentType, VK} from 'vk-io';
import {AppConfig, VkGroup} from './AppConfig';
import {DeleteContactAdminMessageUseCase} from './application/usecases/delete_contact_admin_message/DeleteContactAdminMessageUseCase';
import {GetApiUsageSummaryUseCase} from './application/usecases/get_api_usage_summary/GetApiUsageSummaryUseCase';
import {GetAppUserInfoUseCase} from './application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {GetBeatmapInfoUseCase} from './application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {GetBeatmapUsersBestScoresUseCase} from './application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {GetBeatmapsetDiffsUseCase} from './application/usecases/get_beatmapset_diffs/GetBeatmapsetDiffsUseCase';
import {GetContactAdminMessageUseCase} from './application/usecases/get_contact_admin_message/GetContactAdminMessageUseCase';
import {GetOsuUserInfoUseCase} from './application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {GetOsuUserUpdateUseCase} from './application/usecases/get_osu_user_update/GetOsuUserUpdateUseCase';
import {GetUserBestPlaysUseCase} from './application/usecases/get_user_best_plays/GetUserBestPlaysUseCase';
import {GetUserRecentPlaysUseCase} from './application/usecases/get_user_recent_plays/GetUserRecentPlaysUseCase';
import {SaveContactAdminMessageUseCase} from './application/usecases/save_contact_admin_message/SaveContactAdminMessageUseCase';
import {SetUsernameUseCase} from './application/usecases/set_username/SetUsernameUseCase';
import {UnlinkUsernameUseCase} from './application/usecases/unlink_username/UnlinkUsernameUseCase';
import {AppUserApiRequestsSummariesDaoImpl} from './data/dao/AppUserApiRequestsSummariesDaoImpl';
import {AppUserRecentApiRequestsDaoImpl} from './data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUsersDaoImpl} from './data/dao/AppUsersDaoImpl';
import {CachedOsuUsersDaoImpl} from './data/dao/CachedOsuUsersDaoImpl';
import {OsuBeatmapsDaoImpl} from './data/dao/OsuBeatmapsDaoImpl';
import {OsuBeatmapsetsDaoImpl} from './data/dao/OsuBeatmapsetsDaoImpl';
import {OsuBeatmapUserScoresDaoImpl} from './data/dao/OsuBeatmapUserScoresDaoImpl';
import {OsuUserBestScoresDaoImpl} from './data/dao/OsuUserBestScoresDaoImpl';
import {OsuUserRecentScoresDaoImpl} from './data/dao/OsuUserRecentScoresDaoImpl';
import {OsuUsersDaoImpl} from './data/dao/OsuUsersDaoImpl';
import {OsuUserStatsUpdatesDaoImpl} from './data/dao/OsuUserStatsUpdatesDaoImpl';
import {ScoreSimulationsDaoRosu} from './data/dao/ScoreSimulationsDaoRosu';
import {UnreadMessagesDaoImpl} from './data/dao/UnreadMessagesDaoImpl';
import {BanchoApi} from './data/http/bancho/BanchoApi';
import {BanchoClient} from './data/http/bancho/client/BanchoClient';
import {OsuOauthAccessToken} from './data/http/bancho/OsuOauthAccessToken';
import {SqlDb} from './data/persistence/db/SqlDb';
import {SqlDbTable} from './data/persistence/db/SqlDbTable';
import {SqliteDb} from './data/persistence/db/SqliteDb';
import {AppUserApiRequestsCountsTable} from './data/persistence/db/tables/AppUserApiRequestsCountsTable';
import {AppUsersTable} from './data/persistence/db/tables/AppUsersTable';
import {OsuUserSnapshotsTable} from './data/persistence/db/tables/OsuUserSnapshotsTable';
import {SerializedObjectsTable} from './data/persistence/db/tables/SerializedObjectsTable';
import {TimeWindowsTable} from './data/persistence/db/tables/TimeWindowsTable';
import {UnreadMessagesTable} from './data/persistence/db/tables/UnreadMessagesTable';
import {BeatmapsetDiffBriefProvider} from './presentation/commands/common/DiffBriefProvider';
import {
  GetContextualBeatmapIds,
  GetInitiatorAppUserId,
  GetLastSeenBeatmapId,
  GetLocalAppUserIds,
  GetTargetAppUserId,
  SaveLastSeenBeatmapId,
} from './presentation/commands/common/Signatures';
import {
  UserRecentPlays,
  UserRecentPlaysExecutionArgs,
} from './presentation/commands/UserRecentPlays';
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
import {BotMenuVk} from './presentation/vk/commands/BotMenuVk';
import {ChatLeaderboardOnMapVk} from './presentation/vk/commands/ChatLeaderboardOnMapVk';
import {ChatLeaderboardVk} from './presentation/vk/commands/ChatLeaderboardVk';
import {ContactAdminVk} from './presentation/vk/commands/ContactAdminVk';
import {HelpVk} from './presentation/vk/commands/HelpVk';
import {
  ReplyAsBotVk,
  VkCustomPayload,
} from './presentation/vk/commands/ReplyAsBotVk';
import {SetUsernameVk} from './presentation/vk/commands/SetUsernameVk';
import {UserBestPlaysOnMapVk} from './presentation/vk/commands/UserBestPlaysOnMapVk';
import {UserBestPlaysVk} from './presentation/vk/commands/UserBestPlaysVk';
import {UserInfoVk} from './presentation/vk/commands/UserInfoVk';
import {UserRecentPlaysVk} from './presentation/vk/commands/UserRecentPlaysVk';
import {UserUpdateVk} from './presentation/vk/commands/UserUpdateVk';
import {WhynotVk} from './presentation/vk/commands/WhynotVk';
import {VkClient} from './presentation/vk/VkClient';
import {VkIdConverter} from './presentation/vk/VkIdConverter';
import {VkMessageContext} from './presentation/vk/VkMessageContext';
import {OsuServer} from './primitives/OsuServer';
import {wait} from './primitives/Promises';
import {VK_REPLY_PROCESSING} from './primitives/Strings';
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
      console.log('Initializing with production configuration');
      this.currentVkGroup = config.vk.group;
      this.appDb = new SqliteDb('osu.db');
      this.vkDb = new SqliteDb('vk.db');
    } else {
      console.log('Initializing with development configuration');
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
    const unreadMessages = new UnreadMessagesTable(this.appDb);

    const allDbTables = [
      appUsers,
      requestsCounts,
      serializedObjects,
      osuUserSnapshots,
      timeWindows,
      aliases,
      anouncements,
      pastAnouncements,
      unreadMessages,
    ];

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
      timeout: config.osu.bancho.default_timeout,
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

    const unreadMessagesDao = new UnreadMessagesDaoImpl(unreadMessages);
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
    const osuBeatmapsetsDao = new OsuBeatmapsetsDaoImpl(
      osuApiList,
      recentApiRequestsDao
    );
    const scoreSimulationsDao = new ScoreSimulationsDaoRosu(
      config.bot.score_simulation.default_timeout
    );
    const cachedOsuUsersDao = new CachedOsuUsersDaoImpl(osuUserSnapshots);
    const osuUserStatsUpdateDao = new OsuUserStatsUpdatesDaoImpl(
      recentApiRequestsDao
    );

    const getOsuUserInfoUseCase = new GetOsuUserInfoUseCase(osuUsersDao);
    const getAppUserInfoUseCase = new GetAppUserInfoUseCase(appUsersDao);
    const setUsernameUseCase = new SetUsernameUseCase(appUsersDao, osuUsersDao);
    const unlinkUsernameUseCase = new UnlinkUsernameUseCase(appUsersDao);
    const getRecentPlaysUseCase = new GetUserRecentPlaysUseCase(
      recentScoresDao,
      cachedOsuUsersDao,
      osuUsersDao,
      scoreSimulationsDao
    );
    const getUserBestPlaysUseCase = new GetUserBestPlaysUseCase(
      userBestScoresDao,
      cachedOsuUsersDao,
      osuUsersDao,
      scoreSimulationsDao
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
        cachedOsuUsersDao,
        osuUsersDao,
        scoreSimulationsDao
      );
    const getBeatmapsetDiffsUseCase = new GetBeatmapsetDiffsUseCase(
      osuBeatmapsetsDao
    );
    const saveContactAdminMessageUseCase = new SaveContactAdminMessageUseCase(
      unreadMessagesDao
    );
    const getContactAdminMessageUseCase = new GetContactAdminMessageUseCase(
      unreadMessagesDao
    );
    const deleteContactAdminMessageUseCase =
      new DeleteContactAdminMessageUseCase(unreadMessagesDao);
    const getOsuUserUpdateUseCase = new GetOsuUserUpdateUseCase(
      osuUserStatsUpdateDao,
      cachedOsuUsersDao,
      osuUsersDao
    );

    const beatmapsetDiffBriefProvider = new BeatmapsetDiffBriefProvider(
      getBeatmapsetDiffsUseCase,
      getBeatmapInfoUseCase,
      50
    );

    this.vkClient = this.createVkClient({
      vkDb: this.vkDb,
      group: this.currentVkGroup,

      beatmapsetDiffBriefProvider: beatmapsetDiffBriefProvider,

      getOsuUserInfoUseCase: getOsuUserInfoUseCase,
      getAppUserInfoUseCase: getAppUserInfoUseCase,
      setUsernameUseCase: setUsernameUseCase,
      unlinkUsernameUseCase: unlinkUsernameUseCase,
      getRecentPlaysUseCase: getRecentPlaysUseCase,
      getUserBestPlaysUseCase: getUserBestPlaysUseCase,
      getApiUsageSummaryUseCase: getApiUsageSummaryUseCase,
      getBeatmapInfoUseCase: getBeatmapInfoUseCase,
      getBeatmapUsersBestScoresUseCase: getBeatmapUsersBestScoresUseCase,
      saveContactAdminMessageUseCase: saveContactAdminMessageUseCase,
      getContactAdminMessageUseCase: getContactAdminMessageUseCase,
      deleteContactAdminMessageUseCase: deleteContactAdminMessageUseCase,
      getOsuUserUpdateUseCase: getOsuUserUpdateUseCase,

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
    });
    this.stopHandlers.push(async () => {
      recentApiRequestsDao.stopRequestsCleanups();
      await recentApiRequestsDao.cleanUp();
    });
  }

  createVkClient(params: VkClientCreationParams): VkClient {
    const {vkDb} = params;
    const {group} = params;

    const {beatmapsetDiffBriefProvider} = params;

    const {getOsuUserInfoUseCase} = params;
    const {getAppUserInfoUseCase} = params;
    const {setUsernameUseCase} = params;
    const {unlinkUsernameUseCase} = params;
    const {getRecentPlaysUseCase} = params;
    const {getUserBestPlaysUseCase} = params;
    const {getApiUsageSummaryUseCase} = params;
    const {getBeatmapInfoUseCase} = params;
    const {getBeatmapUsersBestScoresUseCase} = params;
    const {saveContactAdminMessageUseCase} = params;
    const {getContactAdminMessageUseCase} = params;
    const {deleteContactAdminMessageUseCase} = params;
    const {getOsuUserUpdateUseCase} = params;

    const {appUserCommandAliasesRepository} = params;
    const {anouncementsRepository} = params;
    const {pastAnouncementsRepository} = params;

    const vk = new VK({
      pollingGroupId: group.id,
      token: group.token,
    });
    const vkClient = new VkClient(vk, group.id, [group.owner]);

    VK_REPLY_PROCESSING.mentionIdOverride = `club${group.id}`;

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
      if (ctx.replyMessage?.senderId === -group.id) {
        // Ignore self as a target user
        return VkIdConverter.vkUserIdToAppUserId(ctx.senderId);
      }
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
    const getMessageId: (ctx: VkMessageContext) => string = ctx => {
      return `${ctx.peerId}:${ctx.conversationMessageId}`;
    };
    const forwardToAdmin: (
      ctx: VkMessageContext
    ) => Promise<void> = async ctx => {
      const appUserId = VkIdConverter.vkUserIdToAppUserId(ctx.senderId);
      const messageId = getMessageId(ctx);
      if (ctx.conversationMessageId === undefined) {
        const possibleAttachments = ctx.attachments.filter(
          a => a.canBeAttached
        );
        await vk.api.messages.send({
          peer_id: group.owner,
          message: `from: ${appUserId}\nmessage_id: ${messageId}\n\n${ctx.text}`,
          attachment:
            possibleAttachments.length === 0
              ? undefined
              : possibleAttachments.map(a => a.toString()).join(','),
          random_id: Math.ceil(Math.random() * 1e6),
        });
        return;
      }
      await vk.api.messages.send({
        peer_id: group.owner,
        message: `from: ${appUserId}\nmessage_id: ${messageId}`,
        forward: JSON.stringify({
          peer_id: ctx.peerId,
          conversation_message_ids: [ctx.conversationMessageId],
        }),
        random_id: Math.ceil(Math.random() * 1e6),
      });
    };
    const tryToReply = async (
      appUserId: string,
      messageId: string,
      text: string,
      payload: VkCustomPayload | undefined
    ): Promise<boolean> => {
      if (!VkIdConverter.isVkId(appUserId)) {
        return false;
      }
      const [peerId, conversationMessageId] = messageId
        .split(':')
        .map(s => parseInt(s));
      if (isNaN(peerId) || isNaN(conversationMessageId)) {
        return false;
      }
      await vk.api.messages.send({
        peer_id: peerId,
        message: text,
        forward: JSON.stringify({
          peer_id: peerId,
          conversation_message_ids: [conversationMessageId],
          is_reply: true,
        }),
        attachment: payload?.attachment,
        random_id: Math.ceil(Math.random() * 1e6),
      });
      return true;
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
    const uploadAndSave = async function (
      this: VkBeatmapCoversTable,
      server: OsuServer,
      beatmapsetId: number,
      url: string
    ): Promise<string | undefined> {
      const serverString = OsuServer[server];
      try {
        console.log(
          `Trying to upload beatmap cover for ${beatmapsetId} (${serverString})`
        );
        const uploadStart = Date.now();
        const attachment = (
          await vk.upload.messagePhoto({
            source: {
              value: url,
            },
          })
        ).toString();
        const uploadTime = Date.now() - uploadStart;
        console.log(
          `Uploaded cover for ${beatmapsetId} (${serverString}) to VK in ${uploadTime}ms`
        );

        await this.add({
          server: server,
          beatmapsetId: beatmapsetId,
          attachment: attachment,
        });
        return attachment;
      } catch (e) {
        if (e instanceof APIError && e.code === 100) {
          console.log(
            `Cover for ${beatmapsetId} (${serverString}) does not exist`
          );
          return undefined;
        }
        throw e;
      }
    };
    const vkBeatmapCovers = new VkBeatmapCoversTable(uploadAndSave, vkDb);
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
            /(https?:\/\/)?osu\.ppy\.sh\/b\/(?<ID>\d+)\/?/gi,
            /(https?:\/\/)?osu\.ppy\.sh\/beatmaps\/(?<ID>\d+)\/?/gi,
            /(https?:\/\/)?osu\.ppy\.sh\/beatmapsets\/(\d+)#(osu|taiko|fruits|mania)\/(?<ID>\d+)\/?/gi,
          ],
        };
        return ctx => {
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

          type MapRegexMatchInfo = {
            offset: number;
            server: OsuServer;
            id: number;
          };
          const allMatches: MapRegexMatchInfo[] = [];
          for (const text of texts) {
            const textMatches: MapRegexMatchInfo[] = [];
            for (const server in beatmapLinkRegexes) {
              const serverAsKey = server as keyof typeof OsuServer;
              const serverRegexes = beatmapLinkRegexes[serverAsKey];
              for (const regex of serverRegexes) {
                const matches = text.matchAll(regex);
                for (const match of matches) {
                  const idString = match.groups?.ID;
                  if (idString === undefined) {
                    continue;
                  }
                  const server = OsuServer[serverAsKey];
                  const mapId = parseInt(idString);
                  const existingEntry = [...allMatches, ...textMatches].find(
                    e => e.server === server && e.id === mapId
                  );
                  if (existingEntry !== undefined) {
                    continue;
                  }
                  textMatches.push({
                    offset: match!.index,
                    server: server,
                    id: mapId,
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
    const setUsername = new SetUsernameVk(
      mainTextProcessor,
      getTargetAppUserId,
      setUsernameUseCase,
      unlinkUsernameUseCase,
      getAppUserInfoUseCase
    );
    const userInfo = new UserInfoVk(
      mainTextProcessor,
      getInitiatorAppUserId,
      getTargetAppUserId,
      getOsuUserInfoUseCase,
      getAppUserInfoUseCase
    );
    const beatmapInfo = new BeatmapInfoVk(
      vkBeatmapCovers,
      mainTextProcessor,
      getInitiatorAppUserId,
      getContextualBeatmapIds,
      getLastSeenBeatmapId,
      saveLastSeenBeatmapId,
      getBeatmapInfoUseCase,
      beatmapsetDiffBriefProvider
    );
    const userRecentPlays = new UserRecentPlaysVk(
      vkBeatmapCovers,
      mainTextProcessor,
      getInitiatorAppUserId,
      getTargetAppUserId,
      saveLastSeenBeatmapId,
      getRecentPlaysUseCase,
      getAppUserInfoUseCase
    );
    const userBestPlays = new UserBestPlaysVk(
      vkBeatmapCovers,
      mainTextProcessor,
      getInitiatorAppUserId,
      getTargetAppUserId,
      saveLastSeenBeatmapId,
      getUserBestPlaysUseCase,
      getAppUserInfoUseCase
    );
    const userBestPlaysOnMap = new UserBestPlaysOnMapVk(
      vkBeatmapCovers,
      mainTextProcessor,
      getInitiatorAppUserId,
      getTargetAppUserId,
      getContextualBeatmapIds,
      getLastSeenBeatmapId,
      saveLastSeenBeatmapId,
      getBeatmapUsersBestScoresUseCase,
      getAppUserInfoUseCase,
      beatmapsetDiffBriefProvider
    );
    const chatLeaderboard = new ChatLeaderboardVk(
      mainTextProcessor,
      getInitiatorAppUserId,
      getLocalAppUserIds,
      getOsuUserInfoUseCase,
      getAppUserInfoUseCase
    );
    const chatLeaderboardOnMap = new ChatLeaderboardOnMapVk(
      mainTextProcessor,
      getInitiatorAppUserId,
      getLocalAppUserIds,
      getContextualBeatmapIds,
      getLastSeenBeatmapId,
      saveLastSeenBeatmapId,
      getBeatmapUsersBestScoresUseCase,
      getAppUserInfoUseCase
    );
    const userUpdate = new UserUpdateVk(
      mainTextProcessor,
      getInitiatorAppUserId,
      getTargetAppUserId,
      getOsuUserUpdateUseCase,
      getAppUserInfoUseCase
    );
    const alias = new AliasVk(
      mainTextProcessor,
      getTargetAppUserId,
      appUserCommandAliasesRepository,
      aliasProcessor
    );
    const basicCommands = [
      setUsername,
      userInfo,
      beatmapInfo,
      userRecentPlays,
      userBestPlays,
      userBestPlaysOnMap,
      chatLeaderboard,
      chatLeaderboardOnMap,
      userUpdate,
    ];
    const beatmapMenu = new BeatmapMenuVk(
      mainTextProcessor,
      getInitiatorAppUserId,
      getBeatmapInfoUseCase
    );
    const contactAdmin = new ContactAdminVk(
      group.id,
      mainTextProcessor,
      getInitiatorAppUserId,
      getMessageId,
      forwardToAdmin,
      saveContactAdminMessageUseCase
    );
    const whynot = new WhynotVk(basicCommands, []);
    whynot.getRepresentativeCommandPrefix = (matchResult, command) => {
      const getLongestPrefix = (prefixes: string[]): string => {
        const maxPrefixLength = Math.max(...prefixes.map(p => p.length));
        const longestPrefix = prefixes.find(p => p.length === maxPrefixLength);
        if (longestPrefix === undefined) {
          throw Error('Could not find longest command prefix');
        }
        return longestPrefix;
      };
      if (command instanceof UserRecentPlays) {
        const onlyPasses: boolean = (() => {
          if (matchResult.isFullMatch) {
            const args = matchResult.commandArgs as
              | UserRecentPlaysExecutionArgs
              | undefined;
            if (args !== undefined) {
              return args.passesOnly;
            }
          }
          if (matchResult.isPartialMatch) {
            const mapping = matchResult.partialMapping;
            const usedPrefix = mapping
              ?.map(e => e.token)
              .find(t => UserRecentPlays.prefixes.matchIgnoringCase(t));
            if (usedPrefix !== undefined) {
              return UserRecentPlays.recentPassesPrefixes.matchIgnoringCase(
                usedPrefix
              );
            }
          }
          return false;
        })();
        if (onlyPasses) {
          return getLongestPrefix(UserRecentPlays.recentPassesPrefixes);
        }
        return getLongestPrefix(UserRecentPlays.recentPlaysPrefixes);
      }
      return getLongestPrefix(command.prefixes);
    };
    whynot.getRepresentativeCommandShortDescription = (
      matchResult,
      command
    ) => {
      if (command instanceof UserRecentPlays) {
        const onlyPasses: boolean = (() => {
          if (matchResult.isFullMatch) {
            const args = matchResult.commandArgs as
              | UserRecentPlaysExecutionArgs
              | undefined;
            if (args !== undefined) {
              return args.passesOnly;
            }
          }
          if (matchResult.isPartialMatch) {
            const mapping = matchResult.partialMapping;
            const usedPrefix = mapping
              ?.map(e => e.token)
              .find(t => UserRecentPlays.prefixes.matchIgnoringCase(t));
            if (usedPrefix !== undefined) {
              return UserRecentPlays.recentPassesPrefixes.matchIgnoringCase(
                usedPrefix
              );
            }
          }
          return false;
        })();
        if (onlyPasses) {
          return 'последние пассы';
        }
      }
      return command.shortDescription;
    };
    for (const command of [...basicCommands, beatmapMenu]) {
      command.link(basicCommands);
    }
    const adminCommands = [
      new ApiUsageSummaryVk(mainTextProcessor, getApiUsageSummaryUseCase),
      new AnouncementsVk(
        mainTextProcessor,
        anouncementsRepository,
        pastAnouncementsRepository,
        sendToAllPeers
      ),
      new ReplyAsBotVk(
        group.id,
        mainTextProcessor,
        tryToReply,
        getContactAdminMessageUseCase,
        deleteContactAdminMessageUseCase
      ),
    ];
    const botMenu = new BotMenuVk(group.id, mainTextProcessor);
    const help = new HelpVk(mainTextProcessor, [
      ...basicCommands,
      alias,
      whynot,
      botMenu,
    ]);
    botMenu.link([...basicCommands, whynot, help]);
    help.commandCategories = {
      'Связанные с игровым сервером (требуют указания префикса сервера)': [
        ...[setUsername, userInfo, beatmapInfo].map(command => ({command})),
        {
          command: userRecentPlays,
          selectedPrefixes: UserRecentPlays.recentPlaysPrefixes,
          shortDescriptionOverride: 'последние скоры',
        },
        {
          command: userRecentPlays,
          selectedPrefixes: UserRecentPlays.recentPassesPrefixes,
          shortDescriptionOverride: 'последние пассы',
        },
        ...[
          userBestPlays,
          userBestPlaysOnMap,
          chatLeaderboard,
          chatLeaderboardOnMap,
        ].map(command => ({command})),
        {
          command: userUpdate,
          shortDescriptionOverride: 'обновить стату на osu!track',
        },
      ],
      Вспомогательные: [...[alias].map(command => ({command}))],
      'Помощь по боту': [
        ...[botMenu, help, whynot].map(command => ({command})),
      ],
    };
    vkClient.publicCommands.push(
      botMenu,
      help,
      ...basicCommands,
      beatmapMenu,
      alias,
      whynot,
      contactAdmin
    );
    vkClient.adminCommands.push(...adminCommands);

    const initActions: (() => Promise<void>)[] = [
      () => vkBeatmapCovers.createTable(),
      () => vkChatLastBeatmaps.createTable(),
    ];
    vkClient.initActions.push(...initActions);

    const mentionRegex = /\[(?:club|id)\d+\|.+?\]/g;
    vkClient.preprocessors.push(async ctx => {
      if (!ctx.hasText || ctx.text === undefined) {
        return ctx;
      }
      // make sure mentions are a single token for current TextProcessor
      const matches = ctx.text.matchAll(mentionRegex);
      for (const match of matches) {
        const mention = match[0];
        if (!mention.includes(' ')) {
          continue;
        }
        ctx.text = ctx.text.replace(
          mention,
          mainTextProcessor.detokenize([mention])
        );
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
    vkClient.onCommandMatch.push((matchResult, command, ctx) => {
      if (!matchResult.isPartialMatch) {
        return;
      }
      if (![...help.commands, help].includes(command)) {
        return;
      }
      const tokenMapping = matchResult.partialMapping!;
      const tokens = tokenMapping.map(e => e.token);
      const usedPrefix = tokens.find(t =>
        command.prefixes.matchIgnoringCase(t)
      );
      if (usedPrefix === undefined) {
        console.warn(
          'Command prefix was not found when searching user input tokens on partial match'
        );
        return;
      }
      const commandDescription =
        UserRecentPlays.recentPassesPrefixes.matchIgnoringCase(usedPrefix)
          ? 'последние пассы'
          : command.shortDescription;
      const helpCommandStr = help.unparse({
        commandPrefix: usedPrefix,
      });
      if (ctx.text === undefined) {
        throw Error('Text should not be undefined on match');
      }
      const whynotCommandStr = whynot.unparse({
        commandText: ctx.text,
      });
      const replyText = `

Вы хотели использовать команду ${usedPrefix} (${commandDescription})?

Помощь по команде: «${helpCommandStr}»
Почему команда не сработала: «${whynotCommandStr}»

      `.trim();
      ctx.reply(VK_REPLY_PROCESSING.sanitize(replyText), {
        keyboard: vkClient.createKeyboard([
          [{text: helpCommandStr, command: helpCommandStr}],
          [{text: whynotCommandStr, command: whynotCommandStr}],
        ]),
      });
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
  switch (process.env.NODE_ENV?.toLowerCase()) {
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

  beatmapsetDiffBriefProvider: BeatmapsetDiffBriefProvider;

  getOsuUserInfoUseCase: GetOsuUserInfoUseCase;
  getAppUserInfoUseCase: GetAppUserInfoUseCase;
  setUsernameUseCase: SetUsernameUseCase;
  unlinkUsernameUseCase: UnlinkUsernameUseCase;
  getRecentPlaysUseCase: GetUserRecentPlaysUseCase;
  getUserBestPlaysUseCase: GetUserBestPlaysUseCase;
  getApiUsageSummaryUseCase: GetApiUsageSummaryUseCase;
  getBeatmapInfoUseCase: GetBeatmapInfoUseCase;
  getBeatmapUsersBestScoresUseCase: GetBeatmapUsersBestScoresUseCase;
  saveContactAdminMessageUseCase: SaveContactAdminMessageUseCase;
  getContactAdminMessageUseCase: GetContactAdminMessageUseCase;
  deleteContactAdminMessageUseCase: DeleteContactAdminMessageUseCase;
  getOsuUserUpdateUseCase: GetOsuUserUpdateUseCase;

  appUserCommandAliasesRepository: AppUserCommandAliasesRepository;
  anouncementsRepository: AnouncementsRepository;
  pastAnouncementsRepository: PastAnouncementsRepository;
};
