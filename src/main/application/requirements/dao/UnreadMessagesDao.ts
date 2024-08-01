export interface UnreadMessagesDao {
  get(appUserId: string): Promise<UnreadMessageInfo | undefined>;
  saveIfDoesNotExist(
    appUserId: string,
    messageId: string,
    text: string
  ): Promise<boolean>;
}

export type UnreadMessageInfo = {
  messageId: string;
  text: string;
};
