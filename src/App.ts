import {IAppConfig} from './IAppConfig';
import {IOsuOauthAccessTokenReadDto} from './oauth/IOsuOauthAccessTokenReadDto';
import {OsuOauthAccessToken} from './oauth/OsuOauthAccessToken';
import axios from 'axios';
import {ContextDefaultState, MessageContext, VK} from 'vk-io';
import {User} from '../bot/User';
import {IUserExtended} from '../dtos/osu/users/IUserExtended';
import {IScore} from '../dtos/osu/scores/IScore';
import {IScores} from '../dtos/osu/scores/IScores';
import {recentTemplate} from '../bot/templates/Recent';

export class App {
  readonly config: IAppConfig;

  ouathToken: OsuOauthAccessToken | undefined;

  apiv2httpClient = axios.create({
    baseURL: 'https://osu.ppy.sh/api/v2',
    timeout: 4e3,
  });

  vk: VK;

  rememberedUsers: User[];

  constructor(config: IAppConfig) {
    console.log('App init');
    this.config = config;
    this.vk = new VK({
      pollingGroupId: this.config.vk.group.id,
      token: this.config.vk.group.token,
    });
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
    if (!this.ouathToken || !this.ouathToken.isValid) {
      await this.refreshToken();
    }
    const text = ctx.text.toLowerCase();
    if (text.startsWith('l n ')) {
      const username = text.substring(4).trim();
      if (!username) {
        ctx.reply('Не указан ник!');
      }
      const url = `users/${username}/osu`;
      const response = await this.apiv2httpClient.get(url, {
        headers: {
          Authorization: `Bearer ${this.ouathToken!.value}`,
        },
      });
      if (response.status === 401) {
        this.ouathToken = undefined;
        this.onMessage(ctx); // retry
        return;
      }
      if (response.status === 404) {
        ctx.reply(
          `Не удалось установить никнейм ${username}: пользователь не найден.`
        );
        return;
      }
      if (response.status !== 200) {
        ctx.reply(
          `Не удалось установить никнейм ${username}: \n${url} вернул код ${response.status}.`
        );
        return;
      }
      const senderId = ctx.senderId;
      const rawUser: IUserExtended = response.data;
      const user = new User(senderId, rawUser);
      this.rememberedUsers.unshift(user);
      ctx.reply(`Установлен ник: ${username}.`);
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
        ctx.reply('Не удалось получить последний скор.');
        return;
      }
      const replyText = recentTemplate(
        score,
        score.beatmap!, // mark as not-null because it is always being returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent (at least now)
        score.beatmapset! // mark as not-null because it is always being returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent (at least now)
      );
      ctx.reply(replyText);
      return;
    }
  }

  async getRecentPlay(user: User): Promise<IScore | undefined> {
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
      this.ouathToken = undefined;
      await this.refreshToken();
      return await this.getRecentPlay(user); // retry
    }
    if (response.status !== 200) {
      return undefined;
    }
    const rawScores: IScores = response.data;
    if (!rawScores || !rawScores.length) {
      return undefined;
    }
    return rawScores[0];
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
      return;
    }
    const rawToken: IOsuOauthAccessTokenReadDto = response.data;
    this.ouathToken = new OsuOauthAccessToken(rawToken);
    console.log('Sucessfully refreshed token!');
  }
}
