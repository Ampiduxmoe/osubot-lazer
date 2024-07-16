import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type OsuUserInfo = {
  id: number;
  username: string;
  preferredMode: OsuRuleset;
  countryCode: string;
  rankGlobal: number | null;
  rankGlobalHighest:
    | {
        value: number;
        date: string;
      }
    | undefined;
  rankCountry: number | null;
  playcount: number;
  level: number;
  /** Total playtime in seconds */
  playtime: number;
  pp: number;
  accuracy: number;
};
