import {IAppConfig, IVkGroup} from './IAppConfig';
import {IOsuOauthAccessTokenReadDto} from './oauth/IOsuOauthAccessTokenReadDto';
import {OsuOauthAccessToken} from './oauth/OsuOauthAccessToken';
import axios from 'axios';
import {ContextDefaultState, MessageContext, VK} from 'vk-io';
import {IUserExtended} from './dtos/osu/users/IUserExtended';
import {IScore} from './dtos/osu/scores/IScore';
import {IScores} from './dtos/osu/scores/IScores';
import {Database, RunResult} from 'sqlite3';
import {PerformanceCalculator} from './bot/performance/PerformanceCalculator';
import {IPerformanceSimulationResult} from './bot/performance/IPerformanceSimulationResult';
import {recentTemplate} from './bot/templates/Recent';
import {BeatmapCoverDbObject, UserDbObject} from './bot/database/Entities';
import {Result} from './primitives/Result';
import {catchedValueToError, stringifyErrors} from './primitives/Errors';

export class App {
  readonly config: IAppConfig;

  ouathToken: OsuOauthAccessToken | undefined;

  apiv2httpClient = axios.create({
    baseURL: 'https://osu.ppy.sh/api/v2',
    timeout: 4e3,
    validateStatus: function () {
      return true;
    },
  });

  vk: VK;
  currentGroup: IVkGroup;
  db: Database;

  constructor(config: IAppConfig) {
    console.log('App initialization started');
    this.config = config;
    const isProd = isProduction(/* fallbackValue = */ true);
    if (isProd) {
      console.log('Initializing as production configuration');
      this.currentGroup = config.vk.group;
      this.db = new Database('osu.db');
    } else {
      console.log('Initializing as development configuration');
      this.currentGroup = config.vk.group_dev;
      this.db = new Database('osu_dev.db');
    }
    this.vk = new VK({
      pollingGroupId: this.currentGroup.id,
      token: this.currentGroup.token,
    });
    PerformanceCalculator.setSimulationEndpoint(
      config.bot.score_simulation_endpoint
    );
    this.initDb();
    this.vk.updates.on('message', ctx => this.onMessage(ctx));
  }

  async start() {
    console.log('App starting...');
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
    if (!this.ouathToken || !this.ouathToken.isValid()) {
      await this.refreshToken();
    }
    const text = ctx.text.toLowerCase();
    if (text.startsWith('l n ')) {
      const username = text.substring(4).trim();
      if (!username) {
        ctx.reply('Не указан ник!');
      }
      const senderId = ctx.senderId;
      const userResult = await this.getUser(senderId, username);
      if (userResult.isFailure) {
        const failure = userResult.asFailure();
        const errorsText = stringifyErrors(failure.errors);
        ctx.reply('Не удалось установить ник' + `\n${errorsText}`);
        return;
      }
      const user = userResult.asSuccess().value;
      if (user === undefined) {
        ctx.reply(
          `Не удалось установить никнейм ${username}: пользователь не найден`
        );
        return;
      }
      ctx.reply(`Установлен ник: ${username}`);
      return;
    }
    if (text.trim() === 'l r') {
      const senderId = ctx.senderId;
      const userResult = await this.getUser(senderId, undefined);
      if (userResult.isFailure) {
        const failure = userResult.asFailure();
        const errorsText = stringifyErrors(failure.errors);
        ctx.reply('Не получать последний скор' + `\n${errorsText}`);
        return;
      }
      const user = userResult.asSuccess().value;
      if (user === undefined) {
        ctx.reply('Не установлен ник');
        return;
      }
      const scoreResult = await this.getRecentPlay(user);
      if (scoreResult.isFailure) {
        const failure = scoreResult.asFailure();
        const errorsText = stringifyErrors(failure.errors);
        ctx.reply('Не удалось получить последний скор' + `\n${errorsText}`);
        return;
      }
      const score = scoreResult.asSuccess().value;
      if (score === undefined) {
        ctx.reply('Нет последних скоров!');
        return;
      }
      const scoreSimResult = await this.getScoreSim(score);
      if (scoreSimResult.isFailure) {
        const failure = scoreSimResult.asFailure();
        const errorsText = stringifyErrors(failure.errors);
        ctx.reply(
          'Не удалось вычислить атрибуты скора (performance_attributes, difficulty_attributes)' +
            `\n${errorsText}`
        );
        return;
      }
      const scoreSim = scoreSimResult.asSuccess().value;
      const recentTemplateResult = await recentTemplate(
        score,
        score.beatmap!, // mark as not-null because it is always being returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent (at least now)
        score.beatmapset!, // mark as not-null because it is always being returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent (at least now)
        scoreSim
      );
      if (recentTemplateResult.isFailure) {
        const failure = recentTemplateResult.asFailure();
        const errorsText = stringifyErrors(failure.errors);
        ctx.reply('Не удалось сгенерировать текст ответа' + `\n${errorsText}`);
        return;
      }
      const replyText = recentTemplateResult.asSuccess().value;
      const coverUrlResult = await this.getCoverUrl(
        score.beatmap!.beatmapset_id
      );
      if (coverUrlResult.isFailure) {
        const failure = coverUrlResult.asFailure();
        const errorsText = stringifyErrors(failure.errors);
        ctx.reply('Не удалось получить БГ карты' + `\n${errorsText}`);
        return;
      }
      const coverUrl = coverUrlResult.asSuccess().value;
      ctx.reply(replyText, {
        attachment: coverUrl,
      });
      return;
    }
  }

  async getOsuUser(
    username: string
  ): Promise<Result<IUserExtended | undefined>> {
    console.log(`Trying to fetch user ${username}`);
    const url = `users/${username}/osu`;
    const response = await this.apiv2httpClient.get(url, {
      headers: {
        Authorization: `Bearer ${this.ouathToken!.value}`,
      },
    });
    if (response.status === 401) {
      console.log('Received 401 status, invalidating token now');
      this.ouathToken = undefined;
      await this.refreshToken();
      console.log(`Trying to get user ${username} once more...`);
      return await this.getOsuUser(username); // retry
    }
    if (response.status === 404) {
      console.log(`User with username ${username} was not found`);
      return Result.ok(undefined);
    }
    if (response.status !== 200) {
      const errorText = `Could not fetch user ${username}, response status was ${response.status}`;
      console.log(errorText);
      return Result.fail([Error(errorText)]);
    }
    const rawUser: IUserExtended = response.data;
    return Result.ok(rawUser);
  }

  async getRecentPlay(user: UserDbObject): Promise<Result<IScore | undefined>> {
    console.log(`Trying to get recent play for ${user.username}...`);
    const response = await this.apiv2httpClient.get(
      `users/${user.osu_id}/scores/recent`,
      {
        params: {
          include_fails: 1,
          mode: 'osu',
          limit: 1,
        },
        headers: {
          Authorization: `Bearer ${this.ouathToken!.value}`,
        },
      }
    );
    if (response.status === 401) {
      console.log('Received 401 status, invalidating token now');
      this.ouathToken = undefined;
      await this.refreshToken();
      console.log(
        `Trying to get recent play for ${user.username} once more...`
      );
      return await this.getRecentPlay(user); // retry
    }
    if (response.status !== 200) {
      const errorText = `Could not fetch recent play, response status was ${response.status}`;
      console.log(errorText);
      return Result.fail([Error(errorText)]);
    }
    const rawScores: IScores = response.data;
    if (!rawScores || !rawScores.length) {
      console.log('Scores array was empty');
      return Result.ok(undefined);
    }
    return Result.ok(rawScores[0]);
  }

  async getScoreSim(
    score: IScore
  ): Promise<Result<IPerformanceSimulationResult>> {
    return await PerformanceCalculator.simulate({
      mods: score.mods,
      combo: score.max_combo,
      misses: score.statistics.count_miss,
      mehs: score.statistics.count_50,
      goods: score.statistics.count_100,
      beatmap_id: score.beatmap!.id,
    });
  }

  async refreshToken() {
    console.log('Refreshing OAuth token...');
    const body = {
      client_id: this.config.osu.oauth.id,
      client_secret: this.config.osu.oauth.secret,
      grant_type: 'client_credentials',
      scope: 'public',
    };
    const response = await axios.post('https://osu.ppy.sh/oauth/token', body);
    if (response.status !== 200) {
      console.log('Could not fetch new token');
      return;
    }
    const rawToken: IOsuOauthAccessTokenReadDto = response.data;
    this.ouathToken = new OsuOauthAccessToken(rawToken);
    console.log('Sucessfully refreshed token!');
  }

  initDb() {
    this.db.run(
      'CREATE TABLE IF NOT EXISTS covers (id INTEGER, attachment TEXT)'
    );
    this.db.run(
      'CREATE TABLE IF NOT EXISTS bancho (vk_id INTEGER, osu_id INTEGER, username TEXT, mode INTEGER)'
    );
  }

  async dbRun(stmt: string, opts: unknown[] = []): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(stmt, opts, (res: RunResult, err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  async dbGet<T>(stmt: string, opts: unknown[] = []): Promise<T | undefined> {
    return new Promise<T>((resolve, reject) => {
      this.db.get<T>(stmt, opts, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getUser(
    vk_id: number,
    username: string | undefined
  ): Promise<Result<UserDbObject | undefined>> {
    console.log(
      `Trying to get user with id ${vk_id} and username ${username} from database`
    );
    const user = await this.dbGet<UserDbObject>(
      'SELECT * FROM bancho WHERE vk_id = ?',
      [vk_id]
    );
    if (username === undefined) {
      // if username is not specified then return as is
      // since we can't add or update without username
      return Result.ok(user);
    }
    if (!user) {
      const user = await this.addUser(vk_id, username);
      return user;
    }
    if (user.username !== username) {
      const user = await this.updateUser(vk_id, username);
      return user;
    }
    console.log(`Successfully retrieved user ${JSON.stringify(user)}`);
    return Result.ok(user);
  }

  async addUser(
    vk_id: number,
    username: string
  ): Promise<Result<UserDbObject | undefined>> {
    console.log(`Adding user ${username} to database...`);
    const userResult = await this.getOsuUser(username);
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
      vk_id: vk_id,
      osu_id: user.id,
      username: user.username,
      mode: 0,
    };
    await this.dbRun(
      'INSERT INTO bancho (vk_id, osu_id, username, mode) VALUES (?, ?, ?, ?)',
      [
        userDbObject.vk_id,
        userDbObject.osu_id,
        userDbObject.username,
        userDbObject.mode,
      ]
    );
    console.log(`Added user to database: ${JSON.stringify(userDbObject)}`);
    return Result.ok(userDbObject);
  }

  async updateUser(
    vk_id: number,
    username: string
  ): Promise<Result<UserDbObject | undefined>> {
    console.log(`Updating user ${username} in database...`);
    const userResult = await this.getOsuUser(username);
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
      vk_id: vk_id,
      osu_id: user.id,
      username: user.username,
      mode: 0,
    };
    await this.dbRun(
      'UPDATE bancho SET osu_id = ?, username = ? WHERE vk_id = ?',
      [userDbObject.osu_id, userDbObject.osu_id, userDbObject.vk_id]
    );
    console.log(`Added user to database: ${JSON.stringify(userDbObject)}`);
    return Result.ok(userDbObject);
  }

  async getCoverUrl(beatmapId: number): Promise<Result<string>> {
    const cover = await this.dbGet<BeatmapCoverDbObject>(
      'SELECT * FROM covers WHERE id = ?',
      [beatmapId]
    );
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
      await this.dbRun('INSERT INTO covers (id, attachment) VALUES (?, ?)', [
        beatmapId,
        photo.toString(),
      ]);
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
