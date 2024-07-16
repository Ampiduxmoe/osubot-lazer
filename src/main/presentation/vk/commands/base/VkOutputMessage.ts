export type VkOutputMessage = {
  text: string | undefined;
  attachment: string | undefined;
  buttons: VkOutputMessageButton[][] | undefined;
};

export type VkOutputMessageButton = {
  text: string;
  command: string;
};
