import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../primitives/OsuServer';
export type GetRecentPlaysRequest = {
  appUserId: string;
  server: OsuServer;
  username: string;
  ruleset: OsuRuleset;
  includeFails: boolean;
  startPosition: number;
  quantity: number;
  mods: {
    acronym: string;
    isOptional: boolean;
  }[];
};
