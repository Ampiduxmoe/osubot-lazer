import {DeleteContactAdminMessageUseCase} from '../../application/usecases/delete_contact_admin_message/DeleteContactAdminMessageUseCase';
import {GetContactAdminMessageUseCase} from '../../application/usecases/get_contact_admin_message/GetContactAdminMessageUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {
  ANY_STRING,
  APP_USER_ID,
  CUSTOM_PAYLOAD,
  MESSAGE_ID,
  OWN_COMMAND_PREFIX,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {TextCommand} from './base/TextCommand';

export abstract class ReplyAsBot<
  TContext,
  TOutput,
  TCustomPayload,
> extends TextCommand<
  ReplyAsBotExecutionArgs<TCustomPayload>,
  ReplyAsBotViewParams,
  TContext,
  TOutput
> {
  internalName = ReplyAsBot.name;
  shortDescription = 'ответ на сообщение пользователя';
  longDescription = 'Отправляет пользователю ответ на его сообщение';
  notice = undefined;

  static prefixes = new CommandPrefixes('osubot-reply');
  prefixes = ReplyAsBot.prefixes;

  protected static COMMAND_PREFIX = OWN_COMMAND_PREFIX(ReplyAsBot.prefixes);
  protected COMMAND_PREFIX = ReplyAsBot.COMMAND_PREFIX;
  protected static ADMIN_MESSAGE = ANY_STRING(
    'сообщение',
    'сообщение для пользователя'
  );
  protected ADMIN_MESSAGE = ReplyAsBot.ADMIN_MESSAGE;
  private static commandStructure = [
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: APP_USER_ID, isOptional: false},
    {argument: MESSAGE_ID, isOptional: false},
    {argument: this.ADMIN_MESSAGE, isOptional: false},
    {argument: CUSTOM_PAYLOAD, isOptional: true},
  ];

  constructor(
    public textProcessor: TextProcessor,
    protected tryToReply: (
      appUserId: string,
      messageId: string,
      text: string,
      payload: TCustomPayload | undefined
    ) => Promise<boolean>,
    protected getContactAdminMessageUseCase: GetContactAdminMessageUseCase,
    protected deleteContactAdminMessageUseCase: DeleteContactAdminMessageUseCase
  ) {
    super(ReplyAsBot.commandStructure);
  }

  matchText(
    text: string
  ): CommandMatchResult<ReplyAsBotExecutionArgs<TCustomPayload>> {
    const fail =
      CommandMatchResult.fail<ReplyAsBotExecutionArgs<TCustomPayload>>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    if (ownPrefix === undefined) {
      return fail;
    }
    const payload = argsProcessor.use(CUSTOM_PAYLOAD).extract();
    const appUserId = argsProcessor.use(APP_USER_ID).at(0).extract();
    if (appUserId === undefined) {
      return fail;
    }
    const messageId = argsProcessor.use(MESSAGE_ID).at(0).extract();
    if (messageId === undefined) {
      return fail;
    }
    const adminMessage = argsProcessor.use(this.ADMIN_MESSAGE).at(0).extract();
    if (adminMessage === undefined) {
      return fail;
    }
    if (argsProcessor.remainingTokens.length !== 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      targetAppUserId: appUserId,
      targetMessageId: messageId,
      text: adminMessage,
      payloadFromText: payload,
      fullPayload: undefined,
    });
  }

  process(
    args: ReplyAsBotExecutionArgs<TCustomPayload>
  ): MaybeDeferred<ReplyAsBotViewParams> {
    const valuePromise: Promise<ReplyAsBotViewParams> = (async () => {
      try {
        const success = await this.tryToReply(
          args.targetAppUserId,
          args.targetMessageId,
          args.text,
          args.fullPayload
        );
        if (success) {
          try {
            const contactAdminMessage =
              await this.getContactAdminMessageUseCase.execute({
                appUserId: args.targetAppUserId,
              });
            const messageId = contactAdminMessage.messageInfo?.messageId;
            if (messageId === args.targetMessageId) {
              await this.deleteContactAdminMessageUseCase.execute({
                appUserId: args.targetAppUserId,
              });
            }
          } catch (e) {
            console.error(e);
          }
        }
        return {
          success: success,
          isError: false,
        };
      } catch (e) {
        console.error(e);
        return {
          success: false,
          isError: true,
        };
      }
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(params: ReplyAsBotViewParams): MaybeDeferred<TOutput> {
    return this.createSuccessMessage(params.success, params.isError);
  }

  abstract createSuccessMessage(
    success: boolean,
    isError: boolean
  ): MaybeDeferred<TOutput>;
}

export type ReplyAsBotExecutionArgs<T> = {
  targetAppUserId: string;
  targetMessageId: string;
  text: string;
  payloadFromText: string | undefined;
  fullPayload: T | undefined;
};

export type ReplyAsBotViewParams = {
  success: boolean;
  isError: boolean;
};
