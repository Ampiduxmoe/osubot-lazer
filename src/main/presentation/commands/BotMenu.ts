import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {OWN_COMMAND_PREFIX} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {TextCommand} from './base/TextCommand';

export abstract class BotMenu<TContext, TOutput> extends TextCommand<
  BotMenuExecutionArgs,
  BotMenuViewParams,
  TContext,
  TOutput
> {
  internalName = BotMenu.name;
  shortDescription = 'меню бота';
  longDescription = 'Отображает основное меню бота';
  notices = [];

  static prefixes = new CommandPrefixes('osubot');
  prefixes = BotMenu.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = BotMenu.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: this.COMMAND_PREFIX, isOptional: false},
  ];

  constructor(public textProcessor: TextProcessor) {
    super(BotMenu.commandStructure);
  }

  matchText(text: string): CommandMatchResult<BotMenuExecutionArgs> {
    const fail = CommandMatchResult.fail<BotMenuExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const ownCommandPrefix = argsProcessor
      .use(this.COMMAND_PREFIX)
      .at(0)
      .extract();
    if (ownCommandPrefix === undefined) {
      return fail;
    }

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({});
  }

  process(): MaybeDeferred<BotMenuViewParams> {
    return MaybeDeferred.fromValue({});
  }

  createOutputMessage(): MaybeDeferred<TOutput> {
    return this.createBotMenuMessage();
  }

  abstract createBotMenuMessage(): MaybeDeferred<TOutput>;

  unparse(): string {
    const tokens = [this.COMMAND_PREFIX.unparse(this.prefixes[0])];
    return this.textProcessor.detokenize(tokens);
  }
}

export type BotMenuExecutionArgs = {};

export type BotMenuViewParams = {};
