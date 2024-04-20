export interface GetOsuUserInfoResponse {
  userInfo: OsuUserInfo | undefined;
}

interface OsuUserInfo {
  userId: number;
  username: string;
  accuracy: number;
  pp: number;
  rankGlobal: number;
  countryCode: string;
  rankCountry: number;
  playcount: number;
  playtimeSeconds: number;
  lvl: number;
}
