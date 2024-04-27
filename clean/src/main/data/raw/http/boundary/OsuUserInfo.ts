export interface OsuUserInfo {
  id: number;
  username: string;
  countryCode: string;
  rankGlobal: number;
  rankGlobalHighest:
    | {
        value: number;
        date: string;
      }
    | undefined;
  rankCountry: number;
  playcount: number;
  level: number;
  /** Total playtime in seconds */
  playtime: number;
  pp: number;
  accuracy: number;
}
