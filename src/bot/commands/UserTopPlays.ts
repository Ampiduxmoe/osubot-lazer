import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {CommandMatchResult} from './CommandMatchResult';
import {BanchoUsersCache} from '../database/modules/BanchoUsersCache';
import {BanchoUsers} from '../database/modules/BanchoUsers';
import {stringifyErrors} from '../../primitives/Errors';
import {userTopPlaysTemplate} from '../templates/UserTopPlays';

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
    const commandText = this.getCommandFromPayloadOrText(ctx);
    const tokens = commandText.split(' ');
    if (tokens[1] === 't') {
      const username = tokens[2];
      return CommandMatchResult.ok({username});
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: UserTopPlaysParams,
    ctx: MessageContext<ContextDefaultState> & object
  ) {
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
    const topScoresResult = await this.api.gerBestPlays(osuUserId, 0, 3);
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
    const topPlaysTemplateResult = await userTopPlaysTemplate(scores, 1);
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
}
