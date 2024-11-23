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
    enabledCaptions?: VkNavigationCaption[];
    currentContent?: VkOutputMessageContent;
    navigationButtons?: {
      text: string;
      generateMessage: () => MaybeDeferred<VkOutputMessage>;
    }[][];
    messageListener?: ReplyListener;
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

export type ReplyListener = {
  test: (
    text: string,
    senderInfo: ReplySenderInfo
  ) => 'match' | 'edit' | undefined;
  generateMessage: (
    appUserId: string,
    text: string
  ) => MaybeDeferred<VkOutputMessage>;
  getEdit?: (text: string, senderInfo: ReplySenderInfo) => string;
};

export type ReplySenderInfo = {
  appUserId: string;
  isDialogInitiator: boolean;
};

export enum VkNavigationCaption {
  NAVIGATION_OWNER,
  NAVIGATION_LISTENING,
  NAVIGATION_EXPIRE,
}

export const NAVIGATION_ALL_CAPTIONS: VkNavigationCaption[] = [
  VkNavigationCaption.NAVIGATION_OWNER,
  VkNavigationCaption.NAVIGATION_LISTENING,
  VkNavigationCaption.NAVIGATION_EXPIRE,
];
