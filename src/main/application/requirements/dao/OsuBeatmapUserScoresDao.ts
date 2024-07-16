import {OsuServer} from '../../../primitives/OsuServer';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuUserRecentScore} from './OsuUserRecentScoresDao';

export interface OsuBeatmapUserScoresDao {
  get(
    appUserId: string,
    beatmapId: number,
    osuUserId: number,
    server: OsuServer,
    mods: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[],
    ruleset: OsuRuleset | undefined
  ): Promise<OsuBeatmapUserScore[] | undefined>;
}

export type OsuBeatmapUserScore = Omit<
  OsuUserRecentScore,
  'absolutePosition' | 'beatmap' | 'beatmapset' | 'user'
>;
