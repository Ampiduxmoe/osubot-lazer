import {CommandArgument} from '../../../common/arg_processing/CommandArgument';
import {VkMessageContext} from '../../VkMessageContext';
import {CommandMatchResult} from '../../../common/CommandMatchResult';
import {VkOutputMessage} from './VkOutputMessage';
import {CommandPrefixes} from '../../../common/CommandPrefixes';
import {TextProcessor} from '../../../common/arg_processing/TextProcessor';

export abstract class VkCommand<TExecutionArgs, TViewParams> {
  abstract readonly internalName: string;
  abstract readonly shortDescription: string;
  abstract readonly longDescription: string;
  abstract readonly notice: string | undefined;
  abstract readonly prefixes: CommandPrefixes;
  abstract readonly textProcessor: TextProcessor;
  readonly commandStructure: Readonly<CommandStructureElement>[];
  readonly argGroups: Readonly<Record<string, readonly number[]>> = {};

  constructor(commandStructure: Readonly<CommandStructureElement>[]) {
    this.commandStructure = commandStructure;
  }

  abstract matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<TExecutionArgs>;
  abstract process(args: TExecutionArgs): Promise<TViewParams>;
  abstract createOutputMessage(params: TViewParams): VkOutputMessage;
}

type CommandStructureElement = {
  argument: CommandArgument<unknown>;
  isOptional: boolean;
};

export const NOTICE_ABOUT_SPACES_IN_USERNAMES =
  'Если аргумент содержит в себе пробелы (например ник), нужно писать его в одинарных кавычках';
