import {ModPatternCollection} from '../../../primitives/ModPatternCollection';
import {OsuPlayGrade} from '../../../primitives/OsuPlayGrade';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUserRecentScore} from './OsuUserRecentScoresDao';

export interface OsuUserBestScoresDao {
  get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined,
    filter: OsuUserBestScoreFilter
  ): Promise<OsuUserBestScore[]>;
}

export type OsuUserBestScore = OsuUserRecentScore & {
  pp: number;
};

export type OsuUserBestScoreFilter = {
  modPatterns: ModPatternCollection;
  minGrade?: OsuPlayGrade;
  maxGrade?: OsuPlayGrade;
  minAcc?: number;
  maxAcc?: number;
  minPp?: number;
  maxPp?: number;
};
