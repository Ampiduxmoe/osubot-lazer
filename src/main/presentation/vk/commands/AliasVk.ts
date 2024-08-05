/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
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

  createAliasesMessage(
    userAliases: AppUserCommandAliases
  ): MaybeDeferred<VkOutputMessage> {
    const text = userAliases.aliases
      .map(
        (v, i) => `${i + 1}. Шаблон: ${v.pattern}\n　 Замена: ${v.replacement}`
      )
      .join('\n');
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createNoAliasesMessage(): MaybeDeferred<VkOutputMessage> {
    const text = 'Шаблоны отсутствуют!';
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createAliasAddResultMessage(
    actionCount: number
  ): MaybeDeferred<VkOutputMessage> {
    const text =
      actionCount > 0
        ? 'Шаблонов добавлено: ' + actionCount
        : 'Не удалось добавить шаблон\nДостигнуто максимальное количество шаблонов';
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createAliasDeleteResultMessage(
    actionCount: number
  ): MaybeDeferred<VkOutputMessage> {
    const text =
      actionCount > 0
        ? 'Шаблонов удалено: ' + actionCount
        : 'Не удалось удалить шаблон\nШаблон с заданным номером не найден';
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createTestResultMessage(result: string): MaybeDeferred<VkOutputMessage> {
    const text = result;
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }
}
