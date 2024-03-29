import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {Bancho} from '../database/modules/Bancho';
import {CommandMatchResult} from './CommandMatchResult';
import {stringifyErrors} from '../../primitives/Errors';

export class SetUsername extends BotCommand<SetUsernameParams> {
  name = SetUsername.name;
  title = 'Установить ник';
  description = 'позволяет привязать ник в osu! к вашему аккаунту VK';
  usage = 'n <ваш ник>';

  isAvailable(): Boolean {
    const requiredModules = [this.app.db.getModuleOrDefault(Bancho, undefined)];
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
    const userResult = await this.app.getOrAddUser(senderId, username);
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
}

export interface SetUsernameParams {
  username: string | undefined;
}
