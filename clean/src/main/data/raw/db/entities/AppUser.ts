import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../../primitives/OsuServer';

export interface AppUserKey {
  id: string;
  server: OsuServer;
}
export type AppUser = AppUserKey & {
  osu_id: number;
  username: string;
  ruleset: OsuRuleset;
};
