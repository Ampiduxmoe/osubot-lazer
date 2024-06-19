import {ModAcronym} from '../../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../primitives/OsuServer';

export type GetRecentPlaysRequest = {
  appUserId: string;
  server: OsuServer;
  username: string;
  ruleset: OsuRuleset | undefined;
  includeFails: boolean;
  startPosition: number;
  quantity: number;
  mods: {
    acronym: ModAcronym;
    isOptional: boolean;
  }[];
};
