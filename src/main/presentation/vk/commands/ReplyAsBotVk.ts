/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {DeleteContactAdminMessageUseCase} from '../../../application/usecases/delete_contact_admin_message/DeleteContactAdminMessageUseCase';
import {GetContactAdminMessageUseCase} from '../../../application/usecases/get_contact_admin_message/GetContactAdminMessageUseCase';
import {ReplyAsBot, ReplyAsBotExecutionArgs} from '../../commands/ReplyAsBot';
import {
  APP_USER_ID,
  CUSTOM_PAYLOAD,
  MESSAGE_ID,
} from '../../common/arg_processing/CommandArguments';
import {TextProcessor} from '../../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class ReplyAsBotVk extends ReplyAsBot<
  VkMessageContext,
  VkOutputMessage,
  VkCustomPayload
> {
  groupId: number;
  constructor(
    groupId: number,
    textProcessor: TextProcessor,
    tryToReply: (
      appUserId: string,
      messageId: string,
      text: string,
      payload: VkCustomPayload | undefined
    ) => Promise<boolean>,
    getContactAdminMessageUseCase: GetContactAdminMessageUseCase,
    deleteContactAdminMessageUseCase: DeleteContactAdminMessageUseCase
  ) {
    super(
      textProcessor,
      tryToReply,
      getContactAdminMessageUseCase,
      deleteContactAdminMessageUseCase
    );
    this.groupId = groupId;
  }

  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<ReplyAsBotExecutionArgs<VkCustomPayload>> {
    const fail =
      CommandMatchResult.fail<ReplyAsBotExecutionArgs<VkCustomPayload>>();
    const command: string | undefined = (() => {
      if (ctx.messagePayload?.target === APP_CODE_NAME) {
        return ctx.messagePayload.command;
      }
      return ctx.text;
    })();
    if (command === undefined) {
      return fail;
    }
    if (
      ctx.forwards.length === 1 &&
      ctx.forwards[0].forwards.length === 1 &&
      command.startsWith('-> ') &&
      command.trim().length > '-> '.length
    ) {
      const botMessage = ctx.forwards[0];
      if (botMessage.senderId !== -Math.abs(this.groupId)) {
        return fail;
      }
      const appUserId = /from: (vk:\d+)/g.exec(botMessage.text ?? '')?.at(1);
      const messageId = /message_id: (\d+:\d+)/g
        .exec(botMessage.text ?? '')
        ?.at(1);
      const attachments = ctx.attachments
        .filter(a => a.canBeAttached)
        .map(a => a.toString());
      if (appUserId === undefined || messageId === undefined) {
        return fail;
      }
      return CommandMatchResult.ok({
        targetAppUserId: appUserId,
        targetMessageId: messageId,
        text: command.substring('-> '.length),
        payloadFromText: undefined,
        fullPayload: {
          attachment:
            attachments.length === 0 ? undefined : attachments.join(','),
        },
      });
    }
    const textMatch = this.matchText(command);
    if (!textMatch.isMatch || textMatch.commandArgs === undefined) {
      return fail;
    }
    const attachments = [
      textMatch.commandArgs.payloadFromText,
      ...ctx.attachments.filter(a => a.canBeAttached).map(a => a.toString()),
    ].filter(a => a !== undefined);
    textMatch.commandArgs.fullPayload = {
      attachment: attachments.join(','),
    };
    return textMatch;
  }

  async createSuccessMessage(
    success: boolean,
    isError: boolean
  ): Promise<VkOutputMessage> {
    const successString = success
      ? 'Сообщение отправлено'
      : 'Не удалось отправить сообщение';
    const reasonString = isError ? 'Возникла непредвиденная ошибка' : '';
    return {
      text: `${successString}${success ? '' : '\n' + reasonString}`,
      attachment: undefined,
      buttons: undefined,
    };
  }

  unparse(args: ReplyAsBotExecutionArgs<VkCustomPayload>): string {
    const tokens = [
      this.COMMAND_PREFIX.unparse(this.prefixes[0]),
      APP_USER_ID.unparse(args.targetAppUserId),
      MESSAGE_ID.unparse(args.targetMessageId),
      this.ADMIN_MESSAGE.unparse(args.text),
    ];
    if (args.fullPayload?.attachment !== undefined) {
      tokens.push(CUSTOM_PAYLOAD.unparse(args.fullPayload.attachment));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type VkCustomPayload = {
  attachment: string | undefined;
};
