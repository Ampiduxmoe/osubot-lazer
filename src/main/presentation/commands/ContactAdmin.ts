import {SaveContactAdminMessageUseCase} from '../../application/usecases/save_contact_admin_message/SaveContactAdminMessageUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {CommandArgument} from '../common/arg_processing/CommandArgument';
import {ANY_STRING} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {TextCommand} from './base/TextCommand';
import {GetInitiatorAppUserId} from './common/Signatures';

export abstract class ContactAdmin<
  TContext,
  TOutput,
  TMention,
> extends TextCommand<
  ContactAdminExecutionArgs,
  ContactAdminViewParams,
  TContext,
  TOutput
> {
  internalName = ContactAdmin.name;
  shortDescription = 'связь с админом';
  longDescription = 'Отправляет админу ваше сообщение';
  notices = [];

  static prefixes = new CommandPrefixes('[bot_mention]');
  prefixes = ContactAdmin.prefixes;

  constructor(
    public textProcessor: TextProcessor,
    protected mentionArgument: CommandArgument<TMention>,
    protected isBotMention: (mention: TMention) => boolean,
    protected getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    protected getMessageId: (ctx: TContext) => string,
    protected forwardToAdmin: (ctx: TContext) => Promise<void>,
    protected saveContactAdminMessage: SaveContactAdminMessageUseCase
  ) {
    const USER_MESSAGE = ANY_STRING(
      'сообщение',
      'сообщение пользователя',
      'сообщение пользователя'
    );
    super([
      {argument: mentionArgument, isOptional: false},
      {argument: USER_MESSAGE, isOptional: false},
    ]);
  }

  matchText(text: string): CommandMatchResult<ContactAdminExecutionArgs> {
    const fail = CommandMatchResult.fail<ContactAdminExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const mention = argsProcessor.use(this.mentionArgument).at(0).extract();
    if (mention === undefined || !this.isBotMention(mention)) {
      return fail;
    }
    if (argsProcessor.remainingTokens.length === 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      text: text,
    });
  }

  process(
    args: ContactAdminExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<ContactAdminViewParams> {
    const valuePromise: Promise<ContactAdminViewParams> = (async () => {
      try {
        const appUserId = this.getInitiatorAppUserId(ctx);
        const messageId = this.getMessageId(ctx);
        const text = args.text;
        const result = await this.saveContactAdminMessage.execute({
          appUserId: appUserId,
          messageId: messageId,
          text: text,
        });
        if (result.success) {
          try {
            await this.forwardToAdmin(ctx);
          } catch (e) {
            console.error(e);
          }
        }
        return {
          success: result.success,
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
    return MaybeDeferred.fromInstantPromise(valuePromise);
  }

  createOutputMessage(params: ContactAdminViewParams): MaybeDeferred<TOutput> {
    return this.createSuccessMessage(params.success, params.isError);
  }

  abstract createSuccessMessage(
    success: boolean,
    isError: boolean
  ): MaybeDeferred<TOutput>;
}

export type ContactAdminExecutionArgs = {
  text: string;
};

export type ContactAdminViewParams = {
  success: boolean;
  isError: boolean;
};
