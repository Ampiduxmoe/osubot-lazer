import {RecentScoreInfo} from '../../../data/http/boundary/RecentScoreInfo';
import {OsuServer} from '../../../../primitives/OsuServer';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export interface OsuRecentScoresDao {
  get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    includeFails: boolean,
    mods: {
      acronym: string;
      isOptional: boolean;
    }[],
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<RecentScore[]>;
}

export type RecentScore = RecentScoreInfo & {
  absolutePosision: number;
};
