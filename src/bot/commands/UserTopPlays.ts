import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {CommandMatchResult} from './CommandMatchResult';
import {BanchoUsersCache} from '../database/modules/BanchoUsersCache';
import {BanchoUsers} from '../database/modules/BanchoUsers';

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
    ctx.reply('Команда находится в разработке');
    return;
  }
}

export interface UserTopPlaysParams {
  username: string | undefined;
}
