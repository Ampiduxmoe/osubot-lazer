import {uniquesFilter} from '../../primitives/Arrays';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {
  ANY_STRING,
  OWN_COMMAND_PREFIX,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {TextCommand} from './base/TextCommand';

export abstract class Whynot<TContext, TOutput> extends TextCommand<
  WhynotExecutionArgs,
  WhynotViewParams,
  TContext,
  TOutput
> {
  internalName = Whynot.name;
  shortDescription = 'почему не работает команда';
  longDescription =
    'Отображает информацию о том, как бот понимает текст вашей команды';
  notices = ['При использовании этой команды кавычки ставить не нужно'];

  static prefixes = new CommandPrefixes('osubot-whynot');
  prefixes = Whynot.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = Whynot.COMMAND_PREFIX;
  private static TEXT = ANY_STRING(
    'текст_команды',
    'текст команды',
    'текст вашей команды'
  );
  private TEXT = Whynot.TEXT;
  private static commandStructure = [
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: this.TEXT, isOptional: false},
  ];

  textProcessor: TextProcessor = {
    tokenize(text: string): string[] {
      const i = text.indexOf(' ');
      if (i === -1) {
        return [text];
      }
      return [text.substring(0, i), text.substring(i + 1)];
    },
    detokenize(tokens: string[]): string {
      return tokens.join(' ');
    },
  };

  constructor(
    public commands: readonly TextCommand<
      unknown,
      unknown,
      TContext,
      TOutput
    >[],
    public textPreprocessors: ((text: string) => string)[]
  ) {
    super(Whynot.commandStructure);
  }

  matchText(text: string): CommandMatchResult<WhynotExecutionArgs> {
    const fail = CommandMatchResult.fail<WhynotExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    const commandText = argsProcessor.use(this.TEXT).at(0).extract();
    if (ownPrefix === undefined || commandText === undefined) {
      return fail;
    }

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      commandText: commandText,
    });
  }

  process(args: WhynotExecutionArgs): MaybeDeferred<WhynotViewParams> {
    const {commandText} = args;
    const allTextVariants = [
      commandText,
      ...this.textPreprocessors.map(fn => fn(commandText)),
    ].filter(uniquesFilter);
    let bestMatchInfo: [CommandMatch, string] | undefined = undefined;
    for (const text of allTextVariants) {
      for (const command of this.commands) {
        const matchResult = command.matchText(text);
        const bestMatchLevel =
          (bestMatchInfo?.at(0) as CommandMatch | undefined)?.matchResult
            .matchLevel ?? 0;
        if (matchResult.matchLevel > bestMatchLevel) {
          bestMatchInfo = [
            {
              matchResult: matchResult,
              command: command,
            },
            text,
          ];
        }
      }
    }
    return MaybeDeferred.fromValue({
      inputText: commandText,
      preprocessedText:
        (bestMatchInfo?.at(1) as string | undefined) ?? commandText,
      commandMatch: bestMatchInfo?.at(0) as CommandMatch | undefined,
    });
  }

  createOutputMessage(params: WhynotViewParams): MaybeDeferred<TOutput> {
    const {inputText, preprocessedText, commandMatch} = params;
    if (commandMatch === undefined) {
      return this.createNoMatchMessage(inputText);
    }
    if (commandMatch.matchResult.isPartialMatch) {
      return this.createPartialMatchMessage(
        inputText,
        preprocessedText,
        commandMatch
      );
    }
    if (commandMatch.matchResult.isFullMatch) {
      return this.createFullMatchMessage(
        inputText,
        preprocessedText,
        commandMatch
      );
    }
    throw Error(`Unknown ${this.internalName} command output path`);
  }

  abstract createNoMatchMessage(inputText: string): MaybeDeferred<TOutput>;
  abstract createPartialMatchMessage(
    inputText: string,
    preprocessedText: string,
    match: CommandMatch
  ): MaybeDeferred<TOutput>;
  abstract createFullMatchMessage(
    inputText: string,
    preprocessedText: string,
    match: CommandMatch
  ): MaybeDeferred<TOutput>;
  unparse(args: WhynotExecutionArgs): string {
    const tokens = [
      this.COMMAND_PREFIX.unparse(this.prefixes[0]),
      this.TEXT.unparse(args.commandText),
    ];
    return this.textProcessor.detokenize(tokens);
  }
}

export type WhynotExecutionArgs = {
  commandText: string;
};

export type WhynotViewParams = {
  inputText: string;
  preprocessedText: string;
  commandMatch: CommandMatch | undefined;
};

type CommandMatch = {
  matchResult: CommandMatchResult<unknown>;
  command: TextCommand<unknown, unknown, unknown, unknown>;
};
