import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../../primitives/OsuServer';

export interface AppUser {
  id: string;
  server: OsuServer;
  osu_id: number;
  username: string;
  ruleset: OsuRuleset;
}
