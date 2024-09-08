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
};

export type VkOutputMessageButton = {
  text: string;
  command: string;
};

export type VkOutputMessageContent = {
  text: string | undefined;
  attachment: string | undefined;
  buttons: VkOutputMessageButton[][] | undefined;
};
