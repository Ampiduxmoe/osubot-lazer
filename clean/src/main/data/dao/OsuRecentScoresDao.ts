import {RecentScoreInfo} from '../raw/http/boundary/RecentScoreInfo';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type RecentScore = RecentScoreInfo;

export interface OsuRecentScoresDao {
  get(
    osuUserId: number,
    server: OsuServer,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset
  ): Promise<RecentScoreInfo[]>;
}
