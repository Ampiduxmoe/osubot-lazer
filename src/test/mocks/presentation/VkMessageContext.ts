import {ContextDefaultState, MessageContext} from 'vk-io';
import {VkMessageContext} from '../../../main/presentation/vk/VkMessageContext';
export type FakeVkMessageContext = Pick<
  VkMessageContext,
  | 'senderId'
  | 'peerId'
  | 'chatId'
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
    peerId: params.senderId,
    chatId: undefined,
    text: params.text,
    hasText: true,
    messagePayload: undefined,
    hasMessagePayload: false,
    reply: async () => {
      return {} as MessageContext<ContextDefaultState>;
    },
  };
}

export function createWithPayload(params: {
  senderId: number;
  text: string;
  payload: unknown;
}): FakeVkMessageContext {
  return {
    senderId: params.senderId,
    peerId: params.senderId,
    chatId: undefined,
    text: params.text,
    hasText: true,
    messagePayload: params.payload,
    hasMessagePayload: true,
    reply: async () => {
      return {} as MessageContext<ContextDefaultState>;
    },
  };
}
