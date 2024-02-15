export interface IOsuOauthAccessTokenReadDto {
  token_type: string;
  expires_in: number; // (seconds)
  access_token: string;
}
