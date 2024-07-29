import {ModCombinationPattern} from '../../../primitives/ModCombinationPattern';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUserRecentScore} from './OsuUserRecentScoresDao';

export interface OsuUserBestScoresDao {
  get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    mods: ModCombinationPattern[],
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserBestScore[]>;
}

export type OsuUserBestScore = OsuUserRecentScore & {
  pp: number;
};
