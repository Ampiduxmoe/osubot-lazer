import {ModPatternCollection} from '../../../primitives/ModPatternCollection';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUserRecentScore} from './OsuUserRecentScoresDao';

export interface OsuUserBestScoresDao {
  get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    mods: ModPatternCollection,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserBestScore[]>;
}

export type OsuUserBestScore = OsuUserRecentScore & {
  pp: number;
};
