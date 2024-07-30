import {ModPatternCollection} from '../../../primitives/ModPatternCollection';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUserRecentScore} from './OsuUserRecentScoresDao';

export interface OsuBeatmapUserScoresDao {
  get(
    appUserId: string,
    beatmapId: number,
    osuUserId: number,
    server: OsuServer,
    modPatterns: ModPatternCollection,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuBeatmapUserScore[] | undefined>;
}

export type OsuBeatmapUserScore = Omit<
  OsuUserRecentScore,
  'absolutePosition' | 'beatmap' | 'beatmapset' | 'user'
>;
