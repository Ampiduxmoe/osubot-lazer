/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
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

  async createAnouncementsMessage(
    anouncements: Anouncement[]
  ): Promise<VkOutputMessage> {
    const text = anouncements.map(x => `${x.id}. ${x.description}`).join('\n');
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createNoAnouncementsMessage(): Promise<VkOutputMessage> {
    const text = 'Объявления отсутствуют!';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createAnouncementCreateResultMessage(
    actionSuccess: boolean,
    id: number | undefined
  ): Promise<VkOutputMessage> {
    const text = actionSuccess
      ? `Объявление создано (id: ${id})`
      : 'Не удалось создать объявление';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createAnouncementExecutionMessage(
    actionSuccess: boolean,
    executeChatCount: number
  ): Promise<VkOutputMessage> {
    const text = actionSuccess
      ? `Объявление отправлено (чатов: ${executeChatCount})`
      : 'Объявление не найдено';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createAnouncementEchoMessage(echo: string): Promise<VkOutputMessage> {
    const text = echo;
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }
}
