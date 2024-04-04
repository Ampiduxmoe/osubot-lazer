import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {BanchoUsers} from '../database/modules/BanchoUsers';
import {CommandMatchResult} from './CommandMatchResult';
import {stringifyErrors} from '../../primitives/Errors';
import {BanchoCovers} from '../database/modules/BanchoCovers';
import {recentTemplate} from '../templates/Recent';
import {BanchoUsersCache} from '../database/modules/BanchoUsersCache';

export class RecentPlay extends BotCommand<RecentPlayParams> {
  name = RecentPlay.name;
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
  ): CommandMatchResult<RecentPlayParams> {
    const text = ctx.text!.toLowerCase();
    const tokens = text.split(' ');
    if (tokens[1] === 'r') {
      const username = tokens[2];
      return CommandMatchResult.ok({username});
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: RecentPlayParams,
    ctx: MessageContext<ContextDefaultState> & object
  ) {
    console.log(
      `Executing ${RecentPlay.name} command (${JSON.stringify(params)})`
    );
    const username = params.username;
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
    const scoreResult = await this.api.gerRecentPlay(osuUserId);
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
    const recentTemplateResult = await recentTemplate(
      score,
      score.beatmap!, // mark as not-null because it is always being returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent (at least now)
      score.beatmapset! // mark as not-null because it is always being returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent (at least now)
    );
    if (recentTemplateResult.isFailure) {
      const failure = recentTemplateResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply('Не удалось сгенерировать текст ответа' + `\n${errorsText}`);
      return;
    }
    const replyText = recentTemplateResult.asSuccess().value;
    const covers = this.db.getModule(BanchoCovers);
    const coverResult = await covers.getByIdOrDownload(
      score.beatmap!.beatmapset_id,
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

export interface RecentPlayParams {
  username: string | undefined;
}
