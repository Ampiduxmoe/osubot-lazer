import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type GetUserRecentPlaysResponse = {
  isFailure: boolean;
  failureReason?: 'user not found';
  recentPlays?: OsuUserRecentPlays;
  ruleset?: OsuRuleset;
};

export type OsuUserRecentPlays = {
  username: string;
  plays: OsuUserRecentPlay[];
};

export type OsuUserRecentPlay = {
  absolutePosition: number;
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
  mods: {
    acronym: ModAcronym;
    settings?: ModSettings | object;
  }[];
  passed: boolean;
  mapProgress: number;
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

export type ModSettings = SettingsDT | SettingsDA | SettingsCL;

export type SettingsDT = {
  speedChange?: number;
};

export type SettingsHT = {
  speedChange?: number;
};

export type SettingsDA = {
  ar?: number;
  cs?: number;
  od?: number;
  hp?: number;
};

export type SettingsCL = {
  classicHealth?: boolean;
  classicNoteLock?: boolean;
  fadeHitCircleEarly?: boolean;
  alwaysPlayTailSample?: boolean;
  noSliderHeadAccuracy?: boolean;
};

export class SettingsDefaults {
  static DT: Required<SettingsDT> = {
    speedChange: 1.5,
  };
  static HT: Required<SettingsHT> = {
    speedChange: 0.75,
  };
  static CL: Required<SettingsCL> = {
    classicHealth: true,
    classicNoteLock: true,
    fadeHitCircleEarly: true,
    alwaysPlayTailSample: true,
    noSliderHeadAccuracy: true,
  };
}
