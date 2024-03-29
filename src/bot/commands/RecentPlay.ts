import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {Bancho} from '../database/modules/Bancho';
import {CommandMatchResult} from './CommandMatchResult';
import {stringifyErrors} from '../../primitives/Errors';
import {Covers} from '../database/modules/Covers';
import {UserDbObject} from '../database/Entities';
import {recentTemplate} from '../templates/Recent';

export class RecentPlay extends BotCommand<RecentPlayParams> {
  name = RecentPlay.name;
  title = 'Последний плей';
  description = 'показывает последний сабмитнутый плей игрока';
  usage = 'r [ник]';

  isAvailable(): Boolean {
    const db = this.app.db;
    const requiredModules = [
      db.getModuleOrDefault(Bancho, undefined),
      db.getModuleOrDefault(Covers, undefined),
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
    const username = params.username;
    const users = this.app.db.getModule(Bancho);
    const senderId = ctx.senderId;
    let recentPlayUser: UserDbObject;
    if (username) {
      const userFromDb = await users.getByUsername(username);
      if (userFromDb) {
        recentPlayUser = userFromDb;
      } else {
        const userResult = await this.app.getOsuUser(username);
        if (userResult.isFailure) {
          const failure = userResult.asFailure();
          const errorsText = stringifyErrors(failure.errors);
          ctx.reply('Не удалось получить последний скор' + `\n${errorsText}`);
          return;
        }
        const user = userResult.asSuccess().value;
        if (user === undefined) {
          ctx.reply(`Пользователь с ником ${username} не найден`);
          return;
        }
        recentPlayUser = {
          vk_id: senderId,
          osu_id: user.id,
          username: user.username,
          mode: 0,
        };
      }
    } else {
      const userFromDb = await users.getById(senderId);
      if (userFromDb) {
        recentPlayUser = userFromDb;
      } else {
        ctx.reply('Не установлен ник');
        return;
      }
    }
    const scoreResult = await this.app.getRecentPlay(recentPlayUser);
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
    const scoreSimResult = await this.app.getScoreSim(score);
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
    const coverUrlResult = await this.app.getCoverUrl(
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

export interface RecentPlayParams {
  username: string | undefined;
}
