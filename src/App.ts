import {IAppConfig, IVkGroup} from './IAppConfig';
import {OsuOauthAccessToken} from './oauth/OsuOauthAccessToken';
import axios from 'axios';
import {ContextDefaultState, MessageContext, VK} from 'vk-io';
import {PerformanceCalculator} from './bot/performance/PerformanceCalculator';
import {UserDbObject} from './bot/database/Entities';
import {Result} from './primitives/Result';
import {catchedValueToError} from './primitives/Errors';
import {BotDb} from './bot/database/BotDb';
import {Covers} from './bot/database/modules/Covers';
import {Bancho} from './bot/database/modules/Bancho';
import {BotCommand} from './bot/commands/BotCommand';
import {SetUsername} from './bot/commands/SetUsername';
import {RecentPlay} from './bot/commands/RecentPlay';
import {BanchoApi} from './api/bancho/BanchoApi';

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
    this.banchoApi = new BanchoApi(
      config.osu.oauth.id,
      config.osu.oauth.secret
    );
    this.db.addModules([new Covers(this.db), new Bancho(this.db)]);
    this.commands = [new SetUsername(this), new RecentPlay(this)];
    this.vk = new VK({
      pollingGroupId: this.currentGroup.id,
      token: this.currentGroup.token,
    });
    PerformanceCalculator.setSimulationEndpoint(
      config.bot.score_simulation_endpoint
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

  async getOrAddUser(
    vkId: number,
    username: string | undefined
  ): Promise<Result<UserDbObject | undefined>> {
    console.log(
      `Trying to get user with id ${vkId} and username ${username} from database`
    );
    const users = this.db.getModule(Bancho);
    const user = await users.getById(vkId);
    if (username === undefined) {
      // if username is not specified then return as is
      // since we can't add or update without username
      return Result.ok(user);
    }
    if (!user) {
      const user = await this.addUser(vkId, username);
      return user;
    }
    if (user.username !== username) {
      const user = await this.updateUser(vkId, username);
      return user;
    }
    console.log(`Successfully retrieved user ${JSON.stringify(user)}`);
    return Result.ok(user);
  }

  async addUser(
    vkId: number,
    username: string
  ): Promise<Result<UserDbObject | undefined>> {
    console.log(`Adding user ${username} to database...`);
    const userResult = await this.banchoApi.getUser(username);
    if (userResult.isFailure) {
      const failure = userResult.asFailure();
      const errorText = 'Could not add user to the database';
      return Result.fail([Error(errorText), ...failure.errors]);
    }
    const user = userResult.asSuccess().value;
    if (user === undefined) {
      return Result.ok(undefined);
    }
    const userDbObject: UserDbObject = {
      vk_id: vkId,
      osu_id: user.id,
      username: user.username,
      mode: 0,
    };
    const users = this.db.getModule(Bancho);
    await users.add(userDbObject);
    console.log(`Added user to database: ${JSON.stringify(userDbObject)}`);
    return Result.ok(userDbObject);
  }

  async updateUser(
    vkId: number,
    username: string
  ): Promise<Result<UserDbObject | undefined>> {
    console.log(`Updating user ${username} in database...`);
    const userResult = await this.banchoApi.getUser(username);
    if (userResult.isFailure) {
      const failure = userResult.asFailure();
      const errorText = 'Could not update user';
      console.log(errorText);
      return Result.fail([Error(errorText), ...failure.errors]);
    }
    const user = userResult.asSuccess().value;
    if (user === undefined) {
      return Result.ok(undefined);
    }
    const userDbObject: UserDbObject = {
      vk_id: vkId,
      osu_id: user.id,
      username: user.username,
      mode: 0,
    };
    const users = this.db.getModule(Bancho);
    await users.update(userDbObject);
    console.log(`Added user to database: ${JSON.stringify(userDbObject)}`);
    return Result.ok(userDbObject);
  }

  async getCoverUrl(beatmapId: number): Promise<Result<string>> {
    const covers = this.db.getModule(Covers);
    const cover = await covers.getById(beatmapId);
    if (!cover) {
      const coverUrl = await this.addCover(beatmapId);
      return coverUrl;
    }
    return Result.ok(cover.attachment);
  }

  async addCover(beatmapId: number): Promise<Result<string>> {
    console.log(`Trying to add cover for ${beatmapId}`);
    try {
      const response = await axios.get(
        `https://assets.ppy.sh/beatmaps/${beatmapId}/covers/raw.jpg`,
        {
          responseType: 'arraybuffer',
        }
      );
      if (response.status !== 200) {
        const errorText = `Could not fetch cover for ${beatmapId}`;
        console.log(errorText);
        return Result.fail([Error(errorText)]);
      }

      console.log(`Uploading cover for ${beatmapId} to VK...`);
      const photo = await this.vk.upload.messagePhoto({
        source: {
          value: Buffer.from(response.data),
        },
      });

      console.log(`Adding cover for ${beatmapId} to database...`);
      const covers = this.db.getModule(Covers);
      await covers.add({
        beatmapset_id: beatmapId,
        attachment: photo.toString(),
      });
      console.log(
        `Added cover to database: ${beatmapId} | ${photo.toString()}`
      );

      return Result.ok(photo.toString());
    } catch (e) {
      const errorText = `Error: could not add cover for ${beatmapId}`;
      console.log(errorText);
      console.error(e);
      const internalError = catchedValueToError(e);
      const allErrors =
        internalError === undefined
          ? [Error(errorText)]
          : [Error(errorText), internalError];
      return Result.fail(allErrors);
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
