import {ModAcronym} from '../../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export type GetUserBestPlaysResponse = {
  isFailure: boolean;
  failureReason?: 'user not found';
  bestPlays?: OsuUserBestPlays;
  ruleset?: OsuRuleset;
};

export type OsuUserBestPlays = {
  username: string;
  plays: BestPlay[];
};

export type BestPlay = {
  absolutePosition: number;
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
    stars: number;
    ar: number;
    cs: number;
    od: number;
    hp: number;
    maxCombo: number;
    url: string;
  };
  mods: {
    acronym: ModAcronym;
  }[];
  estimatedStarRating: number | undefined;
  ar: number;
  cs: number;
  od: number;
  hp: number;
  passed: boolean;
  totalScore: number;
  combo: number;
  accuracy: number;
  pp: number;
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
