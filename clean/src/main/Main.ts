import * as fs from 'fs';
import {IAppConfig, IVkGroup} from '../../../src/IAppConfig';
import {VkClient} from './presentation/vk/VkClient';
import {VK} from 'vk-io';
import {UserRecentPlays} from './presentation/vk/commands/UserRecentPlays';
import {GetRecentPlaysUseCase} from './domain/usecases/get_recent_plays/GetRecentPlaysUseCase';
export function main() {
  const configFile = fs.readFileSync('./app-config.json');
  const appConfig: IAppConfig = JSON.parse(configFile.toString());

  let currentGroup: IVkGroup;
  const isProd = isProduction(/* fallbackValue = */ true);
  if (isProd) {
    console.log('Initializing as production configuration');
    currentGroup = appConfig.vk.group;
  } else {
    console.log('Initializing as development configuration');
    currentGroup = appConfig.vk.group_dev;
  }

  const vk = new VK({
    pollingGroupId: currentGroup.id,
    token: currentGroup.token,
  });
  const vkClient = new VkClient(vk);

  const getRecentPlaysUseCase = new GetRecentPlaysUseCase();
  vkClient.addCommands([new UserRecentPlays(getRecentPlaysUseCase)]);

  vkClient.start();

  const shutdown = () => {
    console.log('Program received SIGTERM, attempting to shutdown now...');
    vkClient.stop();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();

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
