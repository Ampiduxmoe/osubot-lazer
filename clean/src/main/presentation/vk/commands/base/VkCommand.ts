import {CommandArgument} from '../../../common/arg_processing/CommandArgument';
import {VkMessageContext} from '../../VkMessageContext';
import {CommandMatchResult} from '../../../common/CommandMatchResult';
import {VkOutputMessage} from './VkOutputMessage';

export abstract class VkCommand<TExecutionArgs, TViewParams> {
  abstract readonly internalName: string;
  abstract readonly shortDescription: string;
  abstract readonly longDescription: string;
  abstract readonly prefixes: CommandPrefixes;
  abstract readonly commandStructure: Readonly<CommandStructureElement>[];

  abstract matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<TExecutionArgs>;
  abstract process(args: TExecutionArgs): Promise<TViewParams>;
  abstract createOutputMessage(params: TViewParams): VkOutputMessage;
}

export class CommandPrefixes extends Array<string> {
  constructor(...prefixes: string[]) {
    super(...prefixes);
  }
  match(s: string) {
    return this.find(x => x === s) !== undefined;
  }
  matchIgnoringCase(s: string) {
    return this.find(x => x.toLowerCase() === s.toLowerCase()) !== undefined;
  }
}

type CommandStructureElement = {
  argument: CommandArgument<unknown>;
  isOptional: boolean;
};
