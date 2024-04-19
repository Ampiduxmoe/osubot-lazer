import {VK} from 'vk-io';
import {AppConfig, VkGroup, BanchoOauthCredentials} from './AppConfig';
import {VkClient} from './presentation/vk/VkClient';
import {GetRecentPlaysUseCase} from './domain/usecases/get_recent_plays/GetRecentPlaysUseCase';
import {BanchoApi} from './data/raw/http/bancho/BanchoApi';
import {OsuUsersDaoImpl} from './data/dao/OsuUsersDaoImpl';
import {GetUserInfoUseCase} from './domain/usecases/get_user_info/GetUserInfoUseCase';
import {UserRecentPlays} from './presentation/vk/commands/UserRecentPlays';
import {UserInfo} from './presentation/vk/commands/UserInfo';

export const APP_CODE_NAME = 'osubot-lazer';

export class App {
  readonly config: AppConfig;

  vkClient: VkClient;
  currentVkGroup: VkGroup;

  constructor(config: AppConfig) {
    console.log('App initialization started');
    this.config = config;
    const isProd = isProduction(/* fallbackValue = */ true);
    if (isProd) {
      console.log('Initializing as production configuration');
      this.currentVkGroup = config.vk.group;
    } else {
      console.log('Initializing as development configuration');
      this.currentVkGroup = config.vk.group_dev;
    }
    this.vkClient = this.createVkClient({
      group: this.currentVkGroup,
      oauth: config.osu.bancho.oauth,
    });
  }

  createVkClient(params: VkClientCreationParams): VkClient {
    const vk = new VK({
      pollingGroupId: params.group.id,
      token: params.group.token,
    });
    const banchoApi = new BanchoApi(params.oauth.id, params.oauth.secret);
    const osuUsersDao = new OsuUsersDaoImpl([banchoApi]);
    const getUserInfoUseCase = new GetUserInfoUseCase(osuUsersDao);

    const getRecentPlaysUseCase = new GetRecentPlaysUseCase();

    const vkClient = new VkClient(vk);
    vkClient.addCommands([
      new UserRecentPlays(getRecentPlaysUseCase),
      new UserInfo(getUserInfoUseCase),
    ]);
    return vkClient;
  }

  async start() {
    console.log('App starting...');
    await this.vkClient.start();
    console.log('App started!');
  }

  async stop() {
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
  oauth: BanchoOauthCredentials;
}
