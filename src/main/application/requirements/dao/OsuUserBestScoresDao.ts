import {OsuServer} from '../../../primitives/OsuServer';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuUserRecentScore} from './OsuUserRecentScoresDao';

export interface OsuUserBestScoresDao {
  get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    mods: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[],
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserBestScore[]>;
}

export type OsuUserBestScore = OsuUserRecentScore & {
  pp: number;
};
