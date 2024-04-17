import {VkMessageContext} from '../../VkMessageContext';
import {CommandMatchResult} from './CommandMatchResult';
import {VkOutputMessage} from './VkOutputMessage';

export abstract class VkCommand<TExecutionParams, TViewParams> {
  abstract matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<TExecutionParams>;
  abstract process(params: TExecutionParams): Promise<TViewParams>;
  abstract createOutputMessage(params: TViewParams): VkOutputMessage;
}
