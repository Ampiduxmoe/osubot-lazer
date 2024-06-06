import {CommandArgument} from '../../../common/arg_processing/CommandArgument';
import {VkMessageContext} from '../../VkMessageContext';
import {CommandMatchResult} from '../../../common/CommandMatchResult';
import {VkOutputMessage} from './VkOutputMessage';
import {CommandPrefixes} from '../../../common/CommandPrefixes';

export abstract class VkCommand<TExecutionArgs, TViewParams> {
  abstract readonly internalName: string;
  abstract readonly shortDescription: string;
  abstract readonly longDescription: string;
  abstract readonly prefixes: CommandPrefixes;
  readonly commandStructure: Readonly<CommandStructureElement>[];

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
