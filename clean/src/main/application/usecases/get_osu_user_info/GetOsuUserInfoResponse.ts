import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export type GetOsuUserInfoResponse = {
  userInfo: OsuUserInfo | undefined;
};

export type OsuUserInfo = {
  userId: number;
  username: string;
  preferredMode: OsuRuleset;
  accuracy: number;
  pp: number;
  rankGlobal: number | null;
  rankGlobalHighest: number | undefined;
  rankGlobalHighestDate: string | undefined;
  countryCode: string;
  rankCountry: number | null;
  playcount: number;
  playtimeSeconds: number;
  level: number;
};
