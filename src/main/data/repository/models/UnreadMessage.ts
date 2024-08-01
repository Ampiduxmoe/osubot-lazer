export type UnreadMessageKey = {
  appUserId: string;
};

export type UnreadMessage = UnreadMessageKey & {
  messageId: string;
  text: string;
};
