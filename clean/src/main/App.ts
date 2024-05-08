import {VK} from 'vk-io';
import {AppConfig, VkGroup} from './AppConfig';
import {VkClient} from './presentation/vk/VkClient';
import {GetRecentPlaysUseCase} from './domain/usecases/get_recent_plays/GetRecentPlaysUseCase';
import {BanchoApi} from './data/raw/http/bancho/BanchoApi';
import {OsuUsersDaoImpl} from './data/dao/OsuUsersDaoImpl';
import {GetOsuUserInfoUseCase} from './domain/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {UserRecentPlays} from './presentation/vk/commands/UserRecentPlays';
import {UserInfo} from './presentation/vk/commands/UserInfo';
import {SetUsername} from './presentation/vk/commands/SetUsername';
import {SetUsernameUseCase} from './domain/usecases/set_username/SetUsernameUseCase';
import {AppUsers} from './data/raw/db/tables/AppUsers';
import {SqliteDb} from './data/raw/db/SqliteDb';
import {SqlDb} from './data/raw/db/SqlDb';
import {GetAppUserInfoUseCase} from './domain/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuIdsAndUsernames} from './data/raw/db/tables/OsuIdsAndUsernames';
import {AppUserApiRequestsCounts} from './data/raw/db/tables/AppUserApiRequestsCounts';
import {AppUsersDaoImpl} from './data/dao/AppUsersDaoImpl';
import {OsuRecentScoresDaoImpl} from './data/dao/OsuRecentScoresDaoImpl';
import {CachedOsuIdsDaoImpl} from './data/dao/CachedOsuIdsDaoImpl';
import {Help} from './presentation/vk/commands/Help';
import {ScoreSimulationsDaoImpl} from './data/dao/ScoreSimulationsDaoImpl';
import {OsutoolsSimulationApi} from './data/raw/http/score_simulation/OsutoolsSImulationApi';
import {AppUserRecentApiRequestsDaoImpl} from './data/dao/AppUserRecentApiRequestsDaoImpl';
import {AppUserApiRequestsSummariesDaoImpl} from './data/dao/AppUserApiRequestsSummariesDaoImpl';
import {TimeWindows} from './data/raw/db/tables/TimeWindows';
import {Timespan} from '../primitives/Timespan';
import {ApiUsageSummary} from './presentation/vk/commands/ApiUsageSummary';
import {GetApiUsageSummaryUseCase} from './domain/usecases/get_api_usage_summary/GetApiUsageSummaryUseCase';

export const APP_CODE_NAME = 'osubot-lazer';

export class App {
  readonly config: AppConfig;

  db: SqlDb;

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
      this.db = new SqliteDb('osu.db');
    } else {
      console.log('Configuring as development configuration');
      this.currentVkGroup = config.vk.group_dev;
      this.db = new SqliteDb('osu_dev.db');
    }

    const scoreSiulationApi = new OsutoolsSimulationApi(
      config.bot.score_simulation.endpoint_url,
      config.bot.score_simulation.default_timeout
    );

    const banchoOuath = config.osu.bancho.oauth;
    const banchoApi = new BanchoApi(banchoOuath.id, banchoOuath.secret);

    const osuApiList = [banchoApi];

    const requestsCounts = new AppUserApiRequestsCounts(this.db);
    const timeWindows = new TimeWindows(this.db);
    const osuIdsAndUsernames = new OsuIdsAndUsernames(this.db);
    const appUsers = new AppUsers(this.db);

    const allDbTables = [
      requestsCounts,
      timeWindows,
      osuIdsAndUsernames,
      appUsers,
    ];

    const requestSummariesDao = new AppUserApiRequestsSummariesDaoImpl(
      requestsCounts,
      timeWindows
    );
    const recentApiRequestsDao = new AppUserRecentApiRequestsDaoImpl(
      requestSummariesDao
    );
    const osuUsersDao = new OsuUsersDaoImpl(
      osuApiList,
      osuIdsAndUsernames,
      recentApiRequestsDao
    );
    const appUsersDao = new AppUsersDaoImpl(appUsers);
    const recentScoresDao = new OsuRecentScoresDaoImpl(
      osuApiList,
      osuIdsAndUsernames,
      recentApiRequestsDao
    );
    const scoreSimulationsDao = new ScoreSimulationsDaoImpl(scoreSiulationApi);
    const cachedOsuIdsDao = new CachedOsuIdsDaoImpl(osuIdsAndUsernames);

    const getOsuUserInfoUseCase = new GetOsuUserInfoUseCase(osuUsersDao);
    const getAppUserInfoUseCase = new GetAppUserInfoUseCase(appUsersDao);
    const setUsernameUseCase = new SetUsernameUseCase(appUsersDao, osuUsersDao);
    const getRecentPlaysUseCase = new GetRecentPlaysUseCase(
      recentScoresDao,
      scoreSimulationsDao,
      cachedOsuIdsDao,
      osuUsersDao
    );
    const getApiUsageSummaryUseCase = new GetApiUsageSummaryUseCase(
      requestSummariesDao
    );

    this.vkClient = this.createVkClient({
      group: this.currentVkGroup,
      getOsuUserInfoUseCase: getOsuUserInfoUseCase,
      getAppUserInfoUseCase: getAppUserInfoUseCase,
      setUsernameUseCase: setUsernameUseCase,
      getRecentPlaysUseCase: getRecentPlaysUseCase,
      getApiUsageSummaryUseCase: getApiUsageSummaryUseCase,
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
      await recentApiRequestsDao.convertToSummaries();
    });
  }

  createVkClient(params: VkClientCreationParams): VkClient {
    const {group} = params;
    const {getOsuUserInfoUseCase} = params;
    const {getAppUserInfoUseCase} = params;
    const {setUsernameUseCase} = params;
    const {getRecentPlaysUseCase} = params;
    const {getApiUsageSummaryUseCase} = params;
    const vk = new VK({
      pollingGroupId: group.id,
      token: group.token,
    });
    const vkClient = new VkClient(vk);
    const commands = [
      new UserInfo(getOsuUserInfoUseCase, getAppUserInfoUseCase),
      new SetUsername(setUsernameUseCase),
      new UserRecentPlays(getRecentPlaysUseCase, getAppUserInfoUseCase),
    ];
    const adminCommands = [
      new ApiUsageSummary([group.owner], getApiUsageSummaryUseCase),
    ];
    const helpCommand = new Help(commands);
    vkClient.addCommands([helpCommand, ...commands]);
    vkClient.addCommands(adminCommands);
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
  group: VkGroup;
  getOsuUserInfoUseCase: GetOsuUserInfoUseCase;
  getAppUserInfoUseCase: GetAppUserInfoUseCase;
  setUsernameUseCase: SetUsernameUseCase;
  getRecentPlaysUseCase: GetRecentPlaysUseCase;
  getApiUsageSummaryUseCase: GetApiUsageSummaryUseCase;
};
