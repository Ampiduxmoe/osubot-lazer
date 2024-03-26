import {IAppConfig} from './IAppConfig';
import {IOsuOauthAccessTokenReadDto} from './oauth/IOsuOauthAccessTokenReadDto';
import {OsuOauthAccessToken} from './oauth/OsuOauthAccessToken';
import axios from 'axios';
import {ContextDefaultState, MessageContext, VK} from 'vk-io';
import {IUserExtended} from './dtos/osu/users/IUserExtended';
import {IScore} from './dtos/osu/scores/IScore';
import {IScores} from './dtos/osu/scores/IScores';
import {Database, RunResult} from 'sqlite3';
import {PerformanceCalculator} from './bot/performance/PerformanceCalculator';
import {User} from './bot/User';
import {IPerformanceSimulationResult} from './bot/performance/IPerformanceSimulationResult';
import {recentTemplate} from './bot/templates/Recent';
import {IBeatmapCover} from './bot/covers/IBeatmapCover';

export class App {
  readonly config: IAppConfig;

  ouathToken: OsuOauthAccessToken | undefined;

  apiv2httpClient = axios.create({
    baseURL: 'https://osu.ppy.sh/api/v2',
    timeout: 4e3,
  });

  vk: VK;
  db: Database;

  rememberedUsers: User[];

  constructor(config: IAppConfig) {
    console.log('App init');
    this.config = config;
    this.vk = new VK({
      pollingGroupId: this.config.vk.group.id,
      token: this.config.vk.group.token,
    });
    PerformanceCalculator.setSimulationEndpoint(
      this.config.bot.score_simulation_endpoint
    );
    this.db = new Database('osu.db');
    this.initDb();
    this.rememberedUsers = [];
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
        await this.onMessage(ctx); // retry
        return;
      }
      if (response.status === 404) {
        console.log(`User with username ${username} was not found`);
        ctx.reply(
          `Не удалось установить никнейм ${username}: пользователь не найден`
        );
        return;
      }
      if (response.status !== 200) {
        console.log(`Could not fetch user ${username}`);
        ctx.reply(
          `Не удалось установить никнейм ${username}: \n${url} вернул код ${response.status}`
        );
        return;
      }
      const senderId = ctx.senderId;
      const rawUser: IUserExtended = response.data;
      const user = new User(senderId, rawUser);
      this.rememberedUsers.unshift(user);
      ctx.reply(`Установлен ник: ${username}`);
      return;
    }
    if (text.trim() === 'l r') {
      const senderId = ctx.senderId;
      const user = this.rememberedUsers.find(user => user.vkId === senderId);
      if (!user) {
        ctx.reply('Не установлен ник!');
        return;
      }
      const score = await this.getRecentPlay(user);
      if (!score) {
        ctx.reply('Не удалось получить последний скор');
        return;
      }
      const scoreSim = await this.getScoreSim(score);
      if (!scoreSim) {
        ctx.reply(
          'Не удалось вычислить атрибуты скора (performance_attributes, difficulty_attributes)'
        );
        return;
      }
      const replyText = await recentTemplate(
        score,
        score.beatmap!, // mark as not-null because it is always being returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent (at least now)
        score.beatmapset!, // mark as not-null because it is always being returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent (at least now)
        scoreSim
      );
      const coverUrl = await this.getCover(score.beatmap!.beatmapset_id);
      ctx.reply(replyText, {
        attachment: coverUrl,
      });
      return;
    }
  }

  async getRecentPlay(user: User): Promise<IScore | undefined> {
    console.log(`Trying to get recent play for ${user.username}...`);
    const response = await this.apiv2httpClient.get(
      `users/${user.osuId}/scores/recent`,
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
      console.log('Trying to get recent play once more...');
      return await this.getRecentPlay(user); // retry
    }
    if (response.status !== 200) {
      console.log('Could not fetch recent play');
      return undefined;
    }
    const rawScores: IScores = response.data;
    if (!rawScores || !rawScores.length) {
      console.log('Scores array was empty');
      return undefined;
    }
    return rawScores[0];
  }

  async getScoreSim(
    score: IScore
  ): Promise<IPerformanceSimulationResult | undefined> {
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

  async getCover(beatmapId: number): Promise<string> {
    const cover = await this.dbGet<IBeatmapCover>(
      'SELECT * FROM covers WHERE id = ?',
      [beatmapId]
    );
    if (!cover || !cover.id) {
      return (await this.addCover(beatmapId)) || '';
    }
    return cover.attachment;
  }

  async addCover(beatmapId: number): Promise<string | undefined> {
    console.log(`Trying to add cover for ${beatmapId}`);
    try {
      const response = await axios.get(
        `https://assets.ppy.sh/beatmaps/${beatmapId}/covers/raw.jpg`,
        {
          responseType: 'arraybuffer',
        }
      );
      if (response.status !== 200) {
        console.log(`Could not fetch cover for ${beatmapId}`);
        return undefined;
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

      return photo.toString();
    } catch (e) {
      console.log(`Error: could not add cover for ${beatmapId}`);
      console.error(e);
      return undefined;
    }
  }
}
