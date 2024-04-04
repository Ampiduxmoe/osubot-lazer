import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {BanchoUsers} from '../database/modules/BanchoUsers';
import {CommandMatchResult} from './CommandMatchResult';
import {stringifyErrors} from '../../primitives/Errors';
import {BanchoUsersCache} from '../database/modules/BanchoUsersCache';
import {UserDbObject} from '../database/Entities';

export class SetUsername extends BotCommand<SetUsernameParams> {
  name = SetUsername.name;
  title = 'Установить ник';
  description = 'позволяет привязать ник в osu! к вашему аккаунту VK';
  usage = 'n <ваш ник>';

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
  ): CommandMatchResult<SetUsernameParams> {
    const text = ctx.text!.toLowerCase();
    const tokens = text.split(' ');
    if (tokens[1] === 'n') {
      const username = tokens[2];
      return CommandMatchResult.ok({username});
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: SetUsernameParams,
    ctx: MessageContext<ContextDefaultState> & object
  ) {
    const username = params.username;
    if (!username) {
      ctx.reply('Не указан ник!');
      return;
    }
    const senderId = ctx.senderId;
    const users = this.db.getModule(BanchoUsers);
    const prevUserBind = await users.getById(senderId);
    const usersCache = this.db.getModule(BanchoUsersCache);
    // main thing we miss to set a username is osu_id
    // we might get it from cache if this username was requested at least once
    const usernameWithId = await usersCache.getByUsername(username);
    if (usernameWithId) {
      console.log(
        `Successfully got osu_id for username ${username} from ${BanchoUsersCache.name}`
      );
      const newUserBind: UserDbObject = {
        vk_id: senderId,
        osu_id: usernameWithId.osu_id,
        username: usernameWithId.username,
        mode: 0,
      };
      if (prevUserBind) {
        await users.update(newUserBind);
      } else {
        await users.add(newUserBind);
      }
      ctx.reply(`Установлен ник: ${newUserBind.username}`);
      return;
    }
    // if not, we need to get osu_id by fetching osu from api
    const userResult = await this.api.getUser(username);
    if (userResult.isFailure) {
      const failure = userResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply(`Не удалось установить ник ${username}` + `\n${errorsText}`);
      return;
    }
    const rawUser = userResult.asSuccess().value;
    if (rawUser === undefined) {
      ctx.reply(
        `Не удалось установить ник ${username}: пользователь не найден`
      );
      return;
    }
    console.log(`Successfully got osu_id for username ${username} from API`);
    await usersCache.add({
      osu_id: rawUser.id,
      username: rawUser.username,
    });
    const newUserBind: UserDbObject = {
      vk_id: senderId,
      osu_id: rawUser.id,
      username: rawUser.username,
      mode: 0,
    };
    if (prevUserBind) {
      await users.update(newUserBind);
    } else {
      await users.add(newUserBind);
    }
    ctx.reply(`Установлен ник: ${newUserBind.username}`);
    return;
  }
}

export interface SetUsernameParams {
  username: string | undefined;
}
