import {MessageContext, ContextDefaultState, Keyboard} from 'vk-io';
import {BotCommand} from './BotCommand';
import {CommandMatchResult} from './CommandMatchResult';
import {BanchoUsersCache} from '../database/modules/BanchoUsersCache';
import {BanchoUsers} from '../database/modules/BanchoUsers';
import {stringifyErrors} from '../../primitives/Errors';
import {BanchoUserStats} from '../database/modules/BanchoUserStats';
import {UserStatsDbObject} from '../../../src/bot/database/Entities';
import {showUserStatsTemplate} from '../templates/ShowUserStats';
import {IUserExtended} from '../../dtos/osu/users/IUserExtended';
import {UsernameDecorations} from '../database/modules/UsernameDecorations';

export class ShowUserStats extends BotCommand<ShowUserStatsParams> {
  name = ShowUserStats.name;
  title = 'Статистика игрока';
  description = 'Показывает подробную статистику игрока';
  usage = 'u [ник]';

  isAvailable(): Boolean {
    const db = this.db;
    const requiredModules = [
      db.getModuleOrDefault(BanchoUsers, undefined),
      db.getModuleOrDefault(BanchoUsersCache, undefined),
      db.getModuleOrDefault(BanchoUserStats, undefined),
      db.getModuleOrDefault(UsernameDecorations, undefined),
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
  ): CommandMatchResult<ShowUserStatsParams> {
    const text = ctx.text!.toLowerCase();
    const tokens = text.split(' ');
    if (tokens[1] === 'u') {
      const username = tokens[2];
      return CommandMatchResult.ok({username});
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: ShowUserStatsParams,
    ctx: MessageContext<ContextDefaultState> & object
  ) {
    let username = params.username;
    if (username === undefined) {
      const users = this.db.getModule(BanchoUsers);
      const senderId = ctx.senderId;
      const userFromDb = await users.getById(senderId);
      if (userFromDb) {
        console.log(
          `Successfully got username for sender ${senderId} from ${BanchoUsers.name}`
        );
        username = userFromDb.username;
      } else {
        ctx.reply('Не установлен ник');
        return;
      }
    }
    const userResult = await this.api.getUser(username);
    if (userResult.isFailure) {
      const failure = userResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply(
        `Не удалось получить данные об игроке ${username}` + `\n${errorsText}`
      );
      return;
    }
    const rawUser = userResult.asSuccess().value;
    if (rawUser === undefined) {
      ctx.reply(`Игрок с ником ${username} не найден`);
      return;
    }
    const keyboard = Keyboard.builder()
      .inline()
      .textButton({
        label: `Топ скоры ${rawUser.username}`,
        payload: {
          command: `l t ${rawUser.username}`,
        },
      });
    const editedUser: IUserExtended = JSON.parse(JSON.stringify(rawUser));
    const decors = this.db.getModule(UsernameDecorations);
    let finalUsername = editedUser.username;
    const decor = await decors.getByUsername(finalUsername);
    if (decor !== undefined) {
      finalUsername = decor.pattern.replace('${username}', finalUsername);
      editedUser.username = finalUsername;
    }
    ctx.reply(showUserStatsTemplate(editedUser), {keyboard});
    const usersCache = this.db.getModule(BanchoUsersCache);
    const cachedUser = await usersCache.getByUsername(username);
    if (cachedUser !== undefined) {
      await usersCache.delete(cachedUser);
    }
    usersCache.add({
      osu_id: rawUser.id,
      username: rawUser.username,
    });
    const userStats = this.db.getModule(BanchoUserStats);
    const existingStats = await userStats.getById(rawUser.id);
    const newStats: UserStatsDbObject = {
      osu_id: rawUser.id,
      username: rawUser.username,
      pp: rawUser.statistics.pp,
      rank: rawUser.statistics.global_rank,
      accuracy: rawUser.statistics.hit_accuracy,
    };
    if (existingStats !== undefined) {
      console.log(
        `Stats for ${rawUser.id} already exist, updating with ${JSON.stringify(
          newStats
        )}`
      );
      userStats.update(newStats);
    } else {
      console.log(
        `Stats for ${
          rawUser.id
        } have not been found, inserting ${JSON.stringify(newStats)}`
      );
      userStats.add(newStats);
    }
    return;
  }
}

export interface ShowUserStatsParams {
  username: string | undefined;
}
