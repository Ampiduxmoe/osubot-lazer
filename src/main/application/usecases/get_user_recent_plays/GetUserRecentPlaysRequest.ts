import {ModCombinationPattern} from '../../../primitives/ModCombinationPattern';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';

export type GetUserRecentPlaysRequest = {
  initiatorAppUserId: string;
  server: OsuServer;
  username: string;
  ruleset: OsuRuleset | undefined;
  includeFails: boolean;
  startPosition: number;
  quantity: number;
  modPatterns: ModCombinationPattern[];
};
