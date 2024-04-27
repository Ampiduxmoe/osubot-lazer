import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../../primitives/OsuServer';

export interface AppUserInfoKey {
  id: string;
  server: OsuServer;
}
export type AppUserInfo = AppUserInfoKey & {
  osu_id: number;
  username: string;
  ruleset: OsuRuleset;
};
