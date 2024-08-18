import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {CommandArgument} from '../../common/arg_processing/CommandArgument';
import {TextProcessor} from '../../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {CommandPrefixes} from '../../common/CommandPrefixes';

export abstract class TextCommand<
  TExecutionArgs,
  TViewParams,
  TContext,
  TOutput,
> {
  abstract readonly internalName: string;
  abstract readonly shortDescription: string;
  abstract readonly longDescription: string;
  abstract readonly notices: string[];
  abstract readonly prefixes: CommandPrefixes;
  abstract readonly textProcessor: TextProcessor;
  readonly commandStructure: Readonly<CommandStructureElement>[];
  readonly argGroups: Readonly<{
    [name: string]: {
      readonly description: string;
      readonly notices: string[];
      readonly memberIndices: readonly number[];
    };
  }> = {};

  constructor(commandStructure: Readonly<CommandStructureElement>[]) {
    this.commandStructure = commandStructure;
  }

  protected otherCommands: TextCommand<unknown, unknown, TContext, TOutput>[] =
    [];
  link(otherCommands: TextCommand<unknown, unknown, TContext, TOutput>[]) {
    this.otherCommands = otherCommands;
  }

  abstract matchText(text: string): CommandMatchResult<TExecutionArgs>;
  abstract matchMessage(ctx: TContext): CommandMatchResult<TExecutionArgs>;
  abstract process(
    args: TExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<TViewParams>;
  abstract createOutputMessage(params: TViewParams): MaybeDeferred<TOutput>;
  abstract unparse(args: TExecutionArgs): string;
}

type CommandStructureElement = {
  argument: CommandArgument<unknown>;
  isOptional: boolean;
};

export const NOTICE_ABOUT_SPACES_IN_USERNAMES =
  'Если аргумент содержит в себе пробелы (например ник), нужно писать его в \'одинарных\', "двойных" или `даже таких` кавычках';
