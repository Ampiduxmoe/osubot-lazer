import {ModPatternCollection} from '../../../primitives/ModPatternCollection';
import {OsuPlayGrade} from '../../../primitives/OsuPlayGrade';
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
  minGrade?: OsuPlayGrade | undefined;
  maxGrade?: OsuPlayGrade | undefined;
  minAcc?: number | undefined;
  maxAcc?: number | undefined;
  minPp?: number | undefined;
  maxPp?: number | undefined;
  calculateDifficulty: boolean;
};
