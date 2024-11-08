import {MaybeDeferred} from '../../primitives/MaybeDeferred';

export type VkOutputMessage = VkOutputMessageContent & {
  /**
   * Paginated message description.
   * If specified, overrides base {@link VkOutputMessageContent}
   */
  pagination?: {
    contents: VkOutputMessageContent[];
    startingIndex: number;
    buttonText: (
      currentIndex: number,
      targetIndex: number
    ) => string | undefined;
  };
  /**
   * Navigation message description.
   * If specified, overrides base {@link VkOutputMessageContent}
   */
  navigation?: {
    currentContent?: VkOutputMessageContent;
    navigationButtons?: {
      text: string;
      generateMessage: () => MaybeDeferred<VkOutputMessage>;
    }[][];
  };
};

export type VkOutputMessageButton = {
  text: string;
  command: string;
};

export type VkOutputMessageContent = {
  text?: string;
  attachment?: string;
  buttons?: VkOutputMessageButton[][];
};
