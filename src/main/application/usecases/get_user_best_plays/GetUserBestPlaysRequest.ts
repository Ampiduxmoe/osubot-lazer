import {ModPatternCollection} from '../../../primitives/ModPatternCollection';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';

export type GetUserBestPlaysRequest = {
  initiatorAppUserId: string;
  server: OsuServer;
  username: string;
  ruleset: OsuRuleset | undefined;
  startPosition: number;
  quantity: number;
  modPatterns: ModPatternCollection;
  calculateDifficulty: boolean;
};
