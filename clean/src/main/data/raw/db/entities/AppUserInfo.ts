import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../../primitives/OsuServer';

export type AppUserInfoKey = {
  id: string;
  server: OsuServer;
};

export type AppUserInfo = AppUserInfoKey & {
  osu_id: number;
  username: string;
  ruleset: OsuRuleset;
};
