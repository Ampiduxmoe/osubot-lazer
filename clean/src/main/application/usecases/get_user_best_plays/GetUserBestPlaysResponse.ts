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
    maxCombo: number | undefined;
    url: string;
    countCircles: number;
    countSliders: number;
    countSpinners: number;
  };
  mods: {
    acronym: ModAcronym;
  }[];
  stars: number | undefined;
  ar: number;
  cs: number;
  od: number;
  hp: number;
  passed: boolean;
  totalScore: number;
  combo: number;
  accuracy: number;
  pp: number;
  statistics: BestPlayStatistics;
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

export type BestPlayStatistics =
  | BestPlayStatisticsOsu
  | BestPlayStatisticsTaiko
  | BestPlayStatisticsCtb
  | BestPlayStatisticsMania;

export type BestPlayStatisticsOsu = {
  countGreat: number;
  countOk: number;
  countMeh: number;
  countMiss: number;
};

export type BestPlayStatisticsTaiko = {
  countGreat: number;
  countOk: number;
  countMiss: number;
};

export type BestPlayStatisticsCtb = {
  countGreat: number;
  countLargeTickHit: number;
  countSmallTickHit: number;
  countSmallTickMiss: number;
  countMiss: number;
};

export type BestPlayStatisticsMania = {
  countPerfect: number;
  countGreat: number;
  countGood: number;
  countOk: number;
  countMeh: number;
  countMiss: number;
};

export type ScoreGrade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
