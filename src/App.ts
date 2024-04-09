import {IAppConfig, IVkGroup} from './IAppConfig';
import {OsuOauthAccessToken} from './oauth/OsuOauthAccessToken';
import {ContextDefaultState, MessageContext, VK} from 'vk-io';
import {PerformanceCalculator} from './bot/performance/PerformanceCalculator';
import {BotDb} from './bot/database/BotDb';
import {BanchoCovers} from './bot/database/modules/BanchoCovers';
import {BanchoUsers} from './bot/database/modules/BanchoUsers';
import {BotCommand} from './bot/commands/BotCommand';
import {SetUsername} from './bot/commands/SetUsername';
import {UserRecentPlays} from './bot/commands/UserRecentPlays';
import {BanchoApi} from './api/bancho/BanchoApi';
import {BanchoUsersCache} from './bot/database/modules/BanchoUsersCache';
import {ChatLeaderboard} from './bot/commands/ChatLeaderboard';
import {BanchoUserStats} from './bot/database/modules/BanchoUserStats';
import {ShowUserStats} from './bot/commands/ShowUserStats';
import {UserTopPlays} from './bot/commands/UserTopPlays';
import {BanchoBeatmapsetsCache} from './bot/database/modules/BanchoBeatmapsetsCache';
import {JsonCache} from './bot/database/modules/JsonCache';
import {BanchoChatBeatmapCache} from './bot/database/modules/BanchoChatBeatmapCache';
import {MapUserScore} from './bot/commands/MapUserScore';
import {ChatMapLeadearboard} from './bot/commands/ChatMapLeaderboard';
import {SetUsernameDecoration} from './bot/commands/SetUsernameDecoration';
import {UsernameDecorations} from './bot/database/modules/UsernameDecorations';

export class App {
  readonly config: IAppConfig;

  ouathToken: OsuOauthAccessToken | undefined;

  banchoApi: BanchoApi;

  vk: VK;
  currentGroup: IVkGroup;
  db: BotDb;
  commands: BotCommand<unknown>[] = [];

  constructor(config: IAppConfig) {
    console.log('App initialization started');
    this.config = config;
    const isProd = isProduction(/* fallbackValue = */ true);
    if (isProd) {
      console.log('Initializing as production configuration');
      this.currentGroup = config.vk.group;
      this.db = new BotDb('osu.db');
    } else {
      console.log('Initializing as development configuration');
      this.currentGroup = config.vk.group_dev;
      this.db = new BotDb('osu_dev.db');
    }
    const jsonCache = new JsonCache(this.db);
    this.banchoApi = new BanchoApi(
      config.osu.oauth.id,
      config.osu.oauth.secret,
      new Promise<JsonCache>((resolve, reject) => {
        jsonCache
          .init()
          .then(() => resolve(jsonCache))
          .catch(e => reject(e));
      })
    );
    this.db.addModules([
      jsonCache,
      new BanchoUsers(this.db),
      new BanchoUsersCache(this.db),
      new BanchoUserStats(this.db),
      new BanchoCovers(this.db),
      new BanchoBeatmapsetsCache(this.db),
      new BanchoChatBeatmapCache(this.db),
      new UsernameDecorations(this.db),
    ]);
    this.vk = new VK({
      pollingGroupId: this.currentGroup.id,
      token: this.currentGroup.token,
    });
    const owner = this.currentGroup.owner;
    this.commands = [
      new SetUsername(this.db, this.banchoApi, this.vk, owner),
      new UserRecentPlays(this.db, this.banchoApi, this.vk, owner),
      new ChatLeaderboard(this.db, this.banchoApi, this.vk, owner),
      new ShowUserStats(this.db, this.banchoApi, this.vk, owner),
      new UserTopPlays(this.db, this.banchoApi, this.vk, owner),
      new MapUserScore(this.db, this.banchoApi, this.vk, owner),
      new ChatMapLeadearboard(this.db, this.banchoApi, this.vk, owner),
      new SetUsernameDecoration(this.db, this.banchoApi, this.vk, owner),
    ];
    PerformanceCalculator.setSimulationEndpoint(
      config.bot.score_simulation.endpoint,
      config.bot.score_simulation.default_timeout
    );
    this.vk.updates.on('message', ctx => this.onMessage(ctx));
  }

  async start() {
    console.log('App starting...');
    await this.db.init();
    for (const command of this.commands) {
      command.init();
    }
    await this.vk.updates.start();
    console.log('App started!');
  }

  async stop() {
    console.log('App stopping...');
    await this.vk.updates.stop();
    console.log('Stopped');
  }

  async onMessage(ctx: MessageContext<ContextDefaultState> & object) {
    if (ctx.isGroup || ctx.isFromGroup || ctx.isEvent) {
      return;
    }
    if (!ctx.hasText || !ctx.text) {
      return;
    }
    for (const command of this.commands) {
      command.process(ctx);
    }
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
