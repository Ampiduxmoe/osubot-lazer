import {VkMessageContext} from '../../VkMessageContext';
import {CommandMatchResult} from './CommandMatchResult';
import {VkOutputMessage} from './VkOutputMessage';

export abstract class VkCommand<TExecutionParams, TViewParams> {
  abstract matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<TExecutionParams>;
  abstract createViewParams(params: TExecutionParams): TViewParams;
  abstract createOutputMessage(params: TViewParams): VkOutputMessage;
}
