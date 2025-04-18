import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type GetBeatmapUsersBestScoresResponse = {
  isFailure: boolean;
  failureReason?: 'beatmap not found';
  baseBeatmap?: OsuMap;
  mapPlays?: OsuMapUserBestPlays[];
  ruleset?: OsuRuleset;
  missingUsernames?: string[];
};

export type OsuMap = {
  beatmapset: {
    id: number;
    status: BeatmapsetRankStatus;
    artist: string;
    title: string;
    creator: string;
    coverUrl: string;
  };
  beatmap: {
    id: number;
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
  collection: {
    playResult: OsuMapUserPlay;
    mapInfo: OsuMap;
  }[];
};

export type OsuMapUserPlay = {
  sortedPosition: number;
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

export type ScoreGrade = 'XH' | 'X' | 'SH' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
