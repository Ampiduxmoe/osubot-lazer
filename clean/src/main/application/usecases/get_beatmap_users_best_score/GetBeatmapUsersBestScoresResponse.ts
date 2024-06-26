import {ModAcronym} from '../../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export type GetBeatmapUsersBestScoresResponse = {
  isFailure: boolean;
  failureReason?: 'beatmap not found';
  map?: OsuMap;
  mapPlays?: OsuMapUserBestPlays[];
  ruleset?: OsuRuleset;
  missingUsernames?: string[];
};

export type OsuMap = {
  beatmapset: {
    status: BeatmapsetRankStatus;
    artist: string;
    title: string;
    creator: string;
  };
  beatmap: {
    difficultyName: string;
    totalLength: number;
    drainLength: number;
    bpm: number;
    estimatedStarRating: number | undefined;
    ar: number;
    cs: number;
    od: number;
    hp: number;
    maxCombo: number;
    url: string;
  };
};

export type OsuMapUserBestPlays = {
  username: string;
  plays: OsuMapUserPlay[];
};

export type OsuMapUserPlay = {
  mods: {
    acronym: ModAcronym;
    settings?:
      | object
      | {
          speedChange?: number;
        };
  }[];
  totalScore: number;
  combo: number;
  accuracy: number;
  pp: {
    value: number | undefined;
    estimatedValue: number | undefined;
    ifFc: number | undefined;
    ifSs: number | undefined;
  };
  orderedHitcounts: number[];
  grade: ScoreGrade;
  date: number;
};

export type BeatmapsetRankStatus =
  | 'Graveyard'
  | 'Wip'
  | 'Pending'
  | 'Ranked'
  | 'Approved'
  | 'Qualified'
  | 'Loved';

export type ScoreGrade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
