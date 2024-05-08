export type SetUsernameResponse = {
  isFailure: boolean;
  failureReason?: 'user not found';
  username?: string;
};
