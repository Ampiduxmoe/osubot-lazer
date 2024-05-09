import {ContextDefaultState, MessageContext} from 'vk-io';
import {VkMessageContext} from '../../src/main/presentation/vk/VkMessageContext';
export type FakeVkMessageContext = Pick<
  VkMessageContext,
  | 'senderId'
  | 'text'
  | 'hasText'
  | 'messagePayload'
  | 'hasMessagePayload'
  | 'reply'
>;

export function createWithOnlyText(params: {
  senderId: number;
  text: string;
}): FakeVkMessageContext {
  return {
    senderId: params.senderId,
    text: params.text,
    hasText: true,
    messagePayload: undefined,
    hasMessagePayload: false,
    reply: async () => {
      return {} as MessageContext<ContextDefaultState>;
    },
  };
}
