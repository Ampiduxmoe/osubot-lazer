export type VkOutputMessage = {
  text: string | undefined;
  attachment: string | undefined;
  buttons: VkOutputMessageButton[][] | undefined;
  pagination?: {
    contents: VkOutputMessagePageContent[];
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

export type VkOutputMessagePageContent = {
  text: string | undefined;
  attachment: string | undefined;
  buttons: VkOutputMessageButton[][] | undefined;
};
