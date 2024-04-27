export interface RawOauthToken {
  token_type: string;
  /** Expiration time in seconds */
  expires_in: number;
  access_token: string;
}
