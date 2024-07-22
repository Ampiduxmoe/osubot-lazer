import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {CommandArgument} from '../common/arg_processing/CommandArgument';
import {
  ANY_STRING,
  OWN_COMMAND_PREFIX,
  VK_FOREIGN_COMMAND_PREFIX,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {TextCommand} from './base/TextCommand';

export abstract class Help<TContext, TOutput> extends TextCommand<
  HelpExecutionArgs,
  HelpViewParams,
  TContext,
  TOutput
> {
  internalName = Help.name;
  shortDescription = 'информация о командах';
  longDescription = 'Отображает информацию о доступных командах';
  notice = undefined;

  static prefixes = new CommandPrefixes('osubot', 'osubot-help');
  prefixes = Help.prefixes;

  protected COMMAND_PREFIX: CommandArgument<string>;
  protected FOREIGN_COMMAND_PREFIX: CommandArgument<string>;
  protected USAGE_VARIANT: CommandArgument<string>;

  textProcessor: TextProcessor;
  commands: TextCommand<unknown, unknown, TContext, TOutput>[];
  constructor(
    textProcessor: TextProcessor,
    commands: TextCommand<unknown, unknown, TContext, TOutput>[]
  ) {
    const COMMAND_PREFIX = OWN_COMMAND_PREFIX(Help.prefixes);
    const FOREIGN_COMMAND_PREFIX = VK_FOREIGN_COMMAND_PREFIX(
      new CommandPrefixes(
        ...Help.prefixes,
        ...commands.map(c => c.prefixes).flat(1)
      )
    );
    const USAGE_VARIANT = ANY_STRING('variant', 'вариант команды');
    super([
      {argument: COMMAND_PREFIX, isOptional: false},
      {argument: FOREIGN_COMMAND_PREFIX, isOptional: true},
      {argument: USAGE_VARIANT, isOptional: true},
    ]);
    this.COMMAND_PREFIX = COMMAND_PREFIX;
    this.FOREIGN_COMMAND_PREFIX = FOREIGN_COMMAND_PREFIX;
    this.USAGE_VARIANT = USAGE_VARIANT;
    this.textProcessor = textProcessor;
    this.commands = commands;
  }

  matchText(text: string): CommandMatchResult<HelpExecutionArgs> {
    const fail = CommandMatchResult.fail<HelpExecutionArgs>();
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
    const commandPrefix = argsProcessor
      .use(this.FOREIGN_COMMAND_PREFIX)
      .at(0)
      .extract();
    const commandUsageVariant = argsProcessor
      .use(this.USAGE_VARIANT)
      .at(0)
      .extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      commandPrefix: commandPrefix,
      usageVariant: commandUsageVariant,
    });
  }

  async process(args: HelpExecutionArgs): Promise<HelpViewParams> {
    const prefixToDescribe = args.commandPrefix;
    if (prefixToDescribe === undefined) {
      return {
        commandList: [this, ...this.commands],
      };
    }
    if (this.prefixes.matchIgnoringCase(prefixToDescribe)) {
      return {
        commandPrefixInput: prefixToDescribe,
        command: this,
      };
    }
    for (const command of this.commands) {
      if (command.prefixes.matchIgnoringCase(prefixToDescribe)) {
        return {
          commandPrefixInput: prefixToDescribe,
          command: command,
          usageVariant: args.usageVariant,
        };
      }
    }
    return {
      commandPrefixInput: prefixToDescribe,
    };
  }

  createOutputMessage(params: HelpViewParams): Promise<TOutput> {
    const {commandList, commandPrefixInput, command, usageVariant} = params;
    if (commandList !== undefined) {
      return this.createCommandListMessage(commandList);
    }
    if (command !== undefined) {
      return this.createCommandDescriptionMessage(
        commandPrefixInput!,
        command,
        usageVariant
      );
    }
    return this.createCommandNotFoundMessage(commandPrefixInput!);
  }

  abstract createCommandNotFoundMessage(
    commandPrefixInput: string
  ): Promise<TOutput>;
  abstract createCommandListMessage(
    commandList: TextCommand<unknown, unknown, unknown, unknown>[]
  ): Promise<TOutput>;

  abstract createCommandDescriptionMessage(
    commandPrefixInput: string,
    command: TextCommand<unknown, unknown, unknown, unknown>,
    argGroup: string | undefined
  ): Promise<TOutput>;

  unparse(args: HelpExecutionArgs): string {
    const tokens = [this.COMMAND_PREFIX.unparse(this.prefixes[0])];
    if (args.commandPrefix !== undefined) {
      tokens.push(this.FOREIGN_COMMAND_PREFIX.unparse(args.commandPrefix));
    }
    if (args.usageVariant !== undefined) {
      tokens.push(this.USAGE_VARIANT.unparse(args.usageVariant));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type HelpExecutionArgs = {
  commandPrefix: string | undefined;
  usageVariant: string | undefined;
};

export type HelpViewParams = {
  commandList?: TextCommand<unknown, unknown, unknown, unknown>[];
  commandPrefixInput?: string;
  command?: TextCommand<unknown, unknown, unknown, unknown>;
  usageVariant?: string;
};
