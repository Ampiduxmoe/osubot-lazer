import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {BanchoUsers} from '../database/modules/BanchoUsers';
import {CommandMatchResult} from './CommandMatchResult';
import {stringifyErrors} from '../../primitives/Errors';
import {BanchoCovers} from '../database/modules/BanchoCovers';
import {userRecentPlaysTemplate} from '../templates/UserRecentPlays';
import {BanchoUsersCache} from '../database/modules/BanchoUsersCache';
import {clamp} from '../../primitives/Numbers';

export class UserRecentPlays extends BotCommand<UserRecentPlaysParams> {
  name = UserRecentPlays.name;
  title = 'Последний плей';
  description = 'показывает последний сабмитнутый плей игрока';
  usage = 'r [ник]';

  isAvailable(): Boolean {
    const db = this.db;
    const requiredModules = [
      db.getModuleOrDefault(BanchoUsers, undefined),
      db.getModuleOrDefault(BanchoUsersCache, undefined),
      db.getModuleOrDefault(BanchoCovers, undefined),
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
  ): CommandMatchResult<UserRecentPlaysParams> {
    const text = ctx.text!.toLowerCase();
    const tokens = text.split(' ');
    if (tokens[1] === 'r') {
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
          offset = clamp(parseResult - 1, 0, 999);
        }
      } else {
        offset = 0;
      }
      if (limitString !== undefined) {
        const parseResult = parseInt(limitString.substring(1));
        if (isNaN(parseResult)) {
          limit = 1;
        } else {
          limit = clamp(parseResult, 1, 10);
        }
      } else {
        limit = 1;
      }
      return CommandMatchResult.ok({username, offset, limit});
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: UserRecentPlaysParams,
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
    const scoresResult = await this.api.gerRecentPlays(
      osuUserId,
      offset,
      limit
    );
    if (scoresResult.isFailure) {
      const failure = scoresResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply('Не удалось получить последний скор' + `\n${errorsText}`);
      return;
    }
    const scores = scoresResult.asSuccess().value;
    if (!scores.length) {
      ctx.reply('Нет последних скоров!');
      return;
    }
    const recentTemplateResult = await userRecentPlaysTemplate(
      scores,
      1 + offset
    );
    if (recentTemplateResult.isFailure) {
      const failure = recentTemplateResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply('Не удалось сгенерировать текст ответа' + `\n${errorsText}`);
      return;
    }
    const replyText = recentTemplateResult.asSuccess().value;
    const covers = this.db.getModule(BanchoCovers);
    if (scores.length > 1) {
      ctx.reply(replyText);
      return;
    }
    const coverResult = await covers.getByIdOrDownload(
      scores[0].beatmap!.beatmapset_id,
      this.vk
    );
    if (coverResult.isFailure) {
      const failure = coverResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply('Не удалось получить БГ карты' + `\n${errorsText}`);
      return;
    }
    const cover = coverResult.asSuccess().value;
    ctx.reply(replyText, {
      attachment: cover.attachment,
    });
    return;
  }
}

export interface UserRecentPlaysParams {
  username: string | undefined;
  offset: number;
  limit: number;
}
