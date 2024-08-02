export type GetContactAdminMessageResponse = {
  messageInfo: MessageInfo | undefined;
};

type MessageInfo = {
  messageId: string;
  text: string;
};
