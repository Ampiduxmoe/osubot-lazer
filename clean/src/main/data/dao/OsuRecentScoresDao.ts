import {OsuServer} from '../../../primitives/OsuServer';

export type OsuRecentScore = unknown;

export interface OsuRecentScoresDao {
  getByUserId(
    osuId: number,
    server: OsuServer,
    includeFails: boolean,
    startPosition: number,
    quantity: number
  ): Promise<OsuRecentScore[]>;
}
