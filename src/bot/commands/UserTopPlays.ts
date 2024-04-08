import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {CommandMatchResult} from './CommandMatchResult';
import {BanchoUsersCache} from '../database/modules/BanchoUsersCache';
import {BanchoUsers} from '../database/modules/BanchoUsers';
import {stringifyErrors} from '../../primitives/Errors';
import {userTopPlaysTemplate} from '../templates/UserTopPlays';
import {clamp} from '../../primitives/Numbers';
import {BanchoChatBeatmapCache} from '../database/modules/BanchoChatBeatmapCache';

export class UserTopPlays extends BotCommand<UserTopPlaysParams> {
  name = UserTopPlays.name;
  title = 'Топ скоры игрока';
  description = 'Показывает лучшие (по пп) плеи игрока';
  usage = 't [ник]';

  isAvailable(): Boolean {
    const db = this.db;
    const requiredModules = [
      db.getModuleOrDefault(BanchoUsers, undefined),
      db.getModuleOrDefault(BanchoUsersCache, undefined),
      db.getModuleOrDefault(BanchoChatBeatmapCache, undefined),
    ];
    for (const module of requiredModules) {
      if (module === undefined) {
        return false;
      }
    }
    return true;
  }
  matchMessage(
    ctx: MessageContext<ContextDefaultState> & object
  ): CommandMatchResult<UserTopPlaysParams> {
    const commandText = this.getCommandFromPayloadOrText(ctx).toLowerCase();
    const tokens = commandText.split(' ');
    if (tokens[1] === 't') {
      let username: string | undefined = tokens[2];
      if (username !== undefined) {
        if (username.startsWith('\\') || username.startsWith('+')) {
          username = undefined;
        }
      }
      const offsetString = tokens.find(t => t.startsWith('\\'));
      const limitString = tokens.find(t => t.startsWith('+'));
      let offset: number, limit: number;
      if (offsetString !== undefined) {
        const parseResult = parseInt(offsetString.substring(1));
        if (isNaN(parseResult)) {
          offset = 0;
        } else {
          offset = clamp(parseResult - 1, 0, 99);
        }
      } else {
        offset = 0;
      }
      if (limitString !== undefined) {
        const parseResult = parseInt(limitString.substring(1));
        if (isNaN(parseResult)) {
          limit = 3;
        } else {
          limit = clamp(parseResult, 1, 10);
        }
      } else {
        if (offsetString !== undefined) {
          limit = 1;
        } else {
          limit = 3;
        }
      }
      return CommandMatchResult.ok({username, limit, offset});
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: UserTopPlaysParams,
    ctx: MessageContext<ContextDefaultState> & object
  ) {
    const username = params.username;
    const offset = params.offset;
    const limit = params.limit;
    const users = this.db.getModule(BanchoUsers);
    const senderId = ctx.senderId;
    let osuUserId: number;
    if (!username) {
      const userFromDb = await users.getById(senderId);
      if (userFromDb) {
        console.log(
          `Successfully got osu_id for sender ${senderId} from ${BanchoUsers.name}`
        );
        osuUserId = userFromDb.osu_id;
      } else {
        ctx.reply('Не установлен ник');
        return;
      }
    } else {
      const usersCache = this.db.getModule(BanchoUsersCache);
      const usernameWithId = await usersCache.getByUsername(username);
      if (usernameWithId) {
        console.log(
          `Successfully got osu_id for username ${username} from ${BanchoUsersCache.name}`
        );
        osuUserId = usernameWithId.osu_id;
      } else {
        const userResult = await this.api.getUser(username);
        if (userResult.isFailure) {
          const failure = userResult.asFailure();
          const errorsText = stringifyErrors(failure.errors);
          ctx.reply('Не удалось получить последний скор' + `\n${errorsText}`);
          return;
        }
        const rawUser = userResult.asSuccess().value;
        if (rawUser === undefined) {
          ctx.reply(`Пользователь с ником ${username} не найден`);
          return;
        }
        usersCache.add({
          osu_id: rawUser.id,
          username: rawUser.username,
        });
        console.log(
          `Successfully got osu_id for username ${username} from API`
        );
        osuUserId = rawUser.id;
      }
    }
    const topScoresResult = await this.api.getBestPlays(
      osuUserId,
      offset,
      limit
    );
    if (topScoresResult.isFailure) {
      const failure = topScoresResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply('Не удалось получить лучшие скоры' + `\n${errorsText}`);
      return;
    }
    const scores = topScoresResult.asSuccess().value;
    if (!scores.length) {
      ctx.reply('Нет лучших скоров!');
      return;
    }
    if (scores.length === 1) {
      const chatBeatmapCache = this.db.getModule(BanchoChatBeatmapCache);
      const prevMap = await chatBeatmapCache.getById(ctx.peerId);
      if (prevMap !== undefined) {
        await chatBeatmapCache.delete(prevMap);
      }
      await chatBeatmapCache.add({
        peer_id: ctx.peerId,
        beatmap_id: scores[0].beatmap!.id,
      });
    }
    const topPlaysTemplateResult = await userTopPlaysTemplate(
      scores,
      1 + offset
    );
    if (topPlaysTemplateResult.isFailure) {
      const failure = topPlaysTemplateResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply('Не удалось сгенерировать текст ответа' + `\n${errorsText}`);
      return;
    }
    const replyText = topPlaysTemplateResult.asSuccess().value;
    ctx.reply(replyText);
    return;
  }
}

export interface UserTopPlaysParams {
  username: string | undefined;
  offset: number;
  limit: number;
}
