export interface VkOutputMessage {
  text: string | undefined;
  attachment: string | undefined;
  buttons: VkOutputMessageButton[][] | undefined;
}

export interface VkOutputMessageButton {
  text: string;
  command: string;
}
