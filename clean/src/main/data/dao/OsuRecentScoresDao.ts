import {OsuServer} from '../../../primitives/OsuServer';
import {UserScore} from 'osu-web.js';

export type OsuRecentScore = UserScore;

export interface OsuRecentScoresDao {
  getByUserId(
    osuId: number,
    server: OsuServer,
    includeFails: boolean,
    startPosition: number,
    quantity: number
  ): Promise<OsuRecentScore[]>;
}
