import {APP_CODE_NAME} from '../../../App';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {
  SetUsername,
  SetUsernameExecutionArgs,
} from '../../commands/SetUsername';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class SetUsernameVk extends SetUsername<
  VkMessageContext,
  VkOutputMessage
> {
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<SetUsernameExecutionArgs> {
    const fail = CommandMatchResult.fail<SetUsernameExecutionArgs>();
    const command: string | undefined = (() => {
      if (ctx.messagePayload?.target === APP_CODE_NAME) {
        return ctx.messagePayload.command;
      }
      return ctx.text;
    })();
    if (command === undefined) {
      return fail;
    }
    return this.matchText(command);
  }

  async createUsernameNotSpecifiedMessage(
    server: OsuServer
  ): Promise<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Не указан ник!
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): Promise<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Пользователь с ником ${usernameInput} не найден
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createUsernameSetMessage(
    server: OsuServer,
    username: string,
    mode: OsuRuleset
  ): Promise<VkOutputMessage> {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const text = `
[Server: ${serverString}]
Установлен ник ${username} (режим: ${modeString})
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }
}
