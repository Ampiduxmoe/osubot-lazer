import {VkMessageContext} from '../../VkMessageContext';
import {CommandMatchResult} from './CommandMatchResult';
import {VkOutputMessage} from './VkOutputMessage';

export abstract class VkCommand<TExecutionParams, TViewParams> {
  abstract prefixes: CommandPrefixes | undefined;

  abstract matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<TExecutionParams>;
  abstract process(params: TExecutionParams): Promise<TViewParams>;
  abstract createOutputMessage(params: TViewParams): VkOutputMessage;
}

export class CommandPrefixes extends Array<string> {
  constructor(prefixes: string[]) {
    super(...prefixes);
  }
  match(s: string) {
    return this.find(x => x === s) !== undefined;
  }
  matchIgnoringCase(s: string) {
    return this.find(x => x.toLowerCase() === s.toLowerCase()) !== undefined;
  }
}
