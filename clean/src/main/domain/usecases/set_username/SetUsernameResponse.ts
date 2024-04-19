export interface SetUsernameResponse {
  isFailure: boolean;
  failureReason?: 'user not found';
  username?: string;
}
