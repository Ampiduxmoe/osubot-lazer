/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {SaveContactAdminMessageUseCase} from '../../../application/usecases/save_contact_admin_message/SaveContactAdminMessageUseCase';
import {GetInitiatorAppUserId} from '../../commands/common/Signatures';
import {
  ContactAdmin,
  ContactAdminExecutionArgs,
} from '../../commands/ContactAdmin';
import {
  VK_MENTION,
  VkMentionArg,
} from '../../common/arg_processing/CommandArguments';
import {TextProcessor} from '../../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class ContactAdminVk extends ContactAdmin<
  VkMessageContext,
  VkOutputMessage,
  VkMentionArg
> {
  groupId: number;
  constructor(
    groupId: number,
    textProcessor: TextProcessor,
    getInitiatorAppUserId: GetInitiatorAppUserId<VkMessageContext>,
    getMessageId: (ctx: VkMessageContext) => string,
    forwardToAdmin: (ctx: VkMessageContext) => Promise<void>,
    saveContactAdminMessage: SaveContactAdminMessageUseCase
  ) {
    super(
      textProcessor,
      VK_MENTION,
      mention => mention.id === groupId,
      getInitiatorAppUserId,
      getMessageId,
      forwardToAdmin,
      saveContactAdminMessage
    );
    this.groupId = groupId;
  }
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<ContactAdminExecutionArgs> {
    const fail = CommandMatchResult.fail<ContactAdminExecutionArgs>();
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

  async createSuccessMessage(
    success: boolean,
    isError: boolean
  ): Promise<VkOutputMessage> {
    const successString = success ? 'Сообщение получено' : '';
    const reasonString = isError
      ? 'Ошибка при обработке сообщения'
      : 'Превышен лимит обращений';
    return {
      text: `${successString}\n${success ? '' : reasonString}`,
      attachment: undefined,
      buttons: undefined,
    };
  }

  unparse(args: ContactAdminExecutionArgs): string {
    const mentionStr = this.mentionArgument.unparse({
      type: 'group',
      id: this.groupId,
      text: `club${this.groupId}`,
    });
    return mentionStr + ' ' + args.text;
  }
}
