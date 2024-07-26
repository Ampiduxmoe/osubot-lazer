import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';

export type GetOsuUserInfoRequest = {
  initiatorAppUserId: string;
  server: OsuServer;
  username: string;
  ruleset: OsuRuleset | undefined;
};
