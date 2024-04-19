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

export const APP_CODE_NAME = 'osubot-lazer';

export class App {
  readonly config: AppConfig;

  db: SqlDb;

  currentVkGroup: VkGroup;
  vkClient: VkClient;

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

    const banchoOuath = config.osu.bancho.oauth;
    const banchoApi = new BanchoApi(banchoOuath.id, banchoOuath.secret);
    const osuUsersDao = new OsuUsersDaoImpl([banchoApi]);

    const appUsers = new AppUsers(this.db);

    const getOsuUserInfoUseCase = new GetOsuUserInfoUseCase(osuUsersDao);
    const getAppUserInfoUseCase = new GetAppUserInfoUseCase(appUsers);
    const setUsernameUseCase = new SetUsernameUseCase(appUsers, osuUsersDao);
    const getRecentPlaysUseCase = new GetRecentPlaysUseCase();

    this.vkClient = this.createVkClient({
      group: this.currentVkGroup,
      getOsuUserInfoUseCase: getOsuUserInfoUseCase,
      getAppUserInfoUseCase: getAppUserInfoUseCase,
      setUsernameUseCase: setUsernameUseCase,
      getRecentPlaysUseCase: getRecentPlaysUseCase,
    });

    (async () => {
      console.log('Started initializing tables');
      const allDbTables = [appUsers];
      const initPromises = allDbTables.map(t => t.init());
      await Promise.all(initPromises);
      console.log('All tables initialized successfully');
    })();
  }

  createVkClient(params: VkClientCreationParams): VkClient {
    const vk = new VK({
      pollingGroupId: params.group.id,
      token: params.group.token,
    });

    const vkClient = new VkClient(vk);
    vkClient.addCommands([
      new UserInfo(params.getOsuUserInfoUseCase, params.getAppUserInfoUseCase),
      new SetUsername(params.setUsernameUseCase),
      new UserRecentPlays(params.getRecentPlaysUseCase),
    ]);
    return vkClient;
  }

  async start(): Promise<void> {
    console.log('App starting...');
    await this.vkClient.start();
    console.log('App started!');
  }

  async stop(): Promise<void> {
    console.log('App stopping...');
    await this.vkClient.stop();
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

interface VkClientCreationParams {
  group: VkGroup;
  getOsuUserInfoUseCase: GetOsuUserInfoUseCase;
  getAppUserInfoUseCase: GetAppUserInfoUseCase;
  setUsernameUseCase: SetUsernameUseCase;
  getRecentPlaysUseCase: GetRecentPlaysUseCase;
}
