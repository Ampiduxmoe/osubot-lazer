/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {ReplyAsBot, ReplyAsBotExecutionArgs} from '../../commands/ReplyAsBot';
import {
  APP_USER_ID,
  CUSTOM_PAYLOAD,
  MESSAGE_ID,
} from '../../common/arg_processing/CommandArguments';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class ReplyAsBotVk extends ReplyAsBot<
  VkMessageContext,
  VkOutputMessage,
  VkCustomPayload
> {
  constructor(
    protected groupId: number,
    ...parentParams: ConstructorParameters<
      typeof ReplyAsBot<VkMessageContext, VkOutputMessage, VkCustomPayload>
    >
  ) {
    super(...parentParams);
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

  createSuccessMessage(
    success: boolean,
    isError: boolean
  ): MaybeDeferred<VkOutputMessage> {
    const successString = success
      ? 'Сообщение отправлено'
      : 'Не удалось отправить сообщение';
    const reasonString = isError ? 'Возникла непредвиденная ошибка' : '';
    return MaybeDeferred.fromValue({
      text: `${successString}${success ? '' : '\n' + reasonString}`,
      attachment: undefined,
      buttons: undefined,
    });
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
