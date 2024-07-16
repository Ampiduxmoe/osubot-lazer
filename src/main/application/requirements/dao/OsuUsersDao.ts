import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';

export interface OsuUsersDao {
  getByUsername(
    appUserId: string,
    username: string,
    server: OsuServer,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUser | undefined>;
}

export type OsuUser = {
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
