import {ModCombinationPattern} from '../../../primitives/ModCombinationPattern';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';

export type GetUserBestPlaysRequest = {
  initiatorAppUserId: string;
  server: OsuServer;
  username: string;
  ruleset: OsuRuleset | undefined;
  startPosition: number;
  quantity: number;
  modPatterns: ModCombinationPattern[];
};
