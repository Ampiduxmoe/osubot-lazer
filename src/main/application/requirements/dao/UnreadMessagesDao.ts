export interface UnreadMessagesDao {
  get(appUserId: string): Promise<UnreadMessageInfo | undefined>;
  saveIfDoesNotExist(
    appUserId: string,
    messageId: string,
    text: string
  ): Promise<boolean>;
  delete(appUserId: string): Promise<void>;
}

export type UnreadMessageInfo = {
  messageId: string;
  text: string;
};
