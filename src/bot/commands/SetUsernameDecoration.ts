import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {CommandMatchResult} from './CommandMatchResult';
import {UsernameDecorations} from '../database/modules/UsernameDecorations';

export class SetUsernameDecoration extends BotCommand<SetUsernameDecorationParams> {
  name = SetUsernameDecoration.name;
  title = 'Статистика игрока';
  description = 'Показывает подробную статистику игрока';
  usage = 'u [ник]';

  isAvailable(): Boolean {
    const db = this.db;
    const requiredModules = [
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
  ): CommandMatchResult<SetUsernameDecorationParams> {
    if (ctx.senderId !== this.adminVkId) {
      return CommandMatchResult.fail();
    }
    const text = ctx.text!.toLowerCase();
    const tokens = text.split(' ');
    const username = tokens[2];
    const pattern = ctx.text!.split(' ').splice(3).join(' ');
    if (tokens[1] === 'decorate') {
      return CommandMatchResult.ok({username, pattern, delete: false});
    } else if (tokens[1] === 'undecorate') {
      return CommandMatchResult.ok({username, pattern, delete: true});
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: SetUsernameDecorationParams,
    ctx: MessageContext<ContextDefaultState> & object
  ) {
    const username = params.username;
    const pattern = params.pattern;
    const del = params.delete;

    const decors = this.db.getModule(UsernameDecorations);
    const decor = await decors.getByUsername(username);
    if (decor !== undefined) {
      await decors.delete(decor);
      if (del) {
        ctx.reply('Успех');
        return;
      }
    }
    await decors.add({username, pattern});
    ctx.reply('Успех');
    return;
  }
}

export interface SetUsernameDecorationParams {
  username: string;
  pattern: string;
  delete: boolean;
}
