/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {Alias, AliasExecutionArgs} from '../../commands/Alias';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {AppUserCommandAliases} from '../../data/models/AppUserCommandAliases';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class AliasVk extends Alias<VkMessageContext, VkOutputMessage> {
  matchMessage(ctx: VkMessageContext): CommandMatchResult<AliasExecutionArgs> {
    const fail = CommandMatchResult.fail<AliasExecutionArgs>();
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

  async createAliasesMessage(
    userAliases: AppUserCommandAliases
  ): Promise<VkOutputMessage> {
    const text = userAliases.aliases
      .map(
        (v, i) => `${i + 1}. Шаблон: ${v.pattern}\n　 Замена: ${v.replacement}`
      )
      .join('\n');
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createNoAliasesMessage(): Promise<VkOutputMessage> {
    const text = 'Шаблоны отсутствуют!';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createAliasAddResultMessage(
    actionCount: number
  ): Promise<VkOutputMessage> {
    const text =
      actionCount > 0
        ? 'Шаблонов добавлено: ' + actionCount
        : 'Не удалось добавить шаблон\nДостигнуто максимальное количество шаблонов';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createAliasDeleteResultMessage(
    actionCount: number
  ): Promise<VkOutputMessage> {
    const text =
      actionCount > 0
        ? 'Шаблонов удалено: ' + actionCount
        : 'Не удалось удалить шаблон\nШаблон с заданным номером не найден';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createTestResultMessage(result: string): Promise<VkOutputMessage> {
    const text = result;
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }
}
