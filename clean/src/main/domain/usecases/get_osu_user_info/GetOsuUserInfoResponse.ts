export interface GetOsuUserInfoResponse {
  userInfo: OsuUserInfo | undefined;
}

interface OsuUserInfo {
  userId: number;
  username: string;
  accuracy: number;
  pp: number;
  rankGlobal: number;
  rankGlobalHighest: number | undefined;
  rankGlobalHighestDate: string | undefined;
  countryCode: string;
  rankCountry: number;
  playcount: number;
  playtimeSeconds: number;
  level: number;
}
