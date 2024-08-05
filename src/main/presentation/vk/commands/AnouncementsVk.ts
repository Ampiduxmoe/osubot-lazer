/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {
  Anouncements,
  AnouncementsExecutionArgs,
} from '../../commands/Anouncements';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {Anouncement} from '../../data/models/Anouncement';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class AnouncementsVk extends Anouncements<
  VkMessageContext,
  VkOutputMessage
> {
  messageMediumPrefix = 'vk';

  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<AnouncementsExecutionArgs> {
    const fail = CommandMatchResult.fail<AnouncementsExecutionArgs>();
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

  createAnouncementsMessage(
    anouncements: Anouncement[]
  ): MaybeDeferred<VkOutputMessage> {
    const text = anouncements.map(x => `${x.id}. ${x.description}`).join('\n');
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createNoAnouncementsMessage(): MaybeDeferred<VkOutputMessage> {
    const text = 'Объявления отсутствуют!';
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createAnouncementCreateResultMessage(
    actionSuccess: boolean,
    id: number | undefined
  ): MaybeDeferred<VkOutputMessage> {
    const text = actionSuccess
      ? `Объявление создано (id: ${id})`
      : 'Не удалось создать объявление';
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createAnouncementExecutionMessage(
    actionSuccess: boolean,
    executeChatCount: number
  ): MaybeDeferred<VkOutputMessage> {
    const text = actionSuccess
      ? `Объявление отправлено (чатов: ${executeChatCount})`
      : 'Объявление не найдено';
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createAnouncementEchoMessage(echo: string): MaybeDeferred<VkOutputMessage> {
    const text = echo;
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }
}
