import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export type GetRecentPlaysResponse = {
  isFailure: boolean;
  failureReason?: 'user not found';
  recentPlays?: OsuUserRecentPlays;
  ruleset?: OsuRuleset;
};

export type OsuUserRecentPlays = {
  username: string;
  plays: RecentPlay[];
};

export type RecentPlay = {
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
    acronym: string;
    settings?: ModSettings | object;
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
  pp: {
    value: number | undefined;
    ifFc: number | undefined;
    ifSs: number | undefined;
  };
  countGreat: number;
  countOk: number;
  countMeh: number;
  countMiss: number;
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
  adjust_pitch?: boolean;
  speed_change?: number;
};

export type SettingsHT = {
  adjust_pitch?: boolean;
  speed_change?: number;
};

export type SettingsDA = {
  drain_rate?: number;
  circle_size?: number;
  approach_rate?: number;
  overall_difficulty?: number;
};

export type SettingsCL = {
  classic_health?: boolean;
  classic_note_lock?: boolean;
  fade_hit_circle_early?: boolean;
  always_play_tail_sample?: boolean;
  no_slider_head_accuracy?: boolean;
};

export class SettingsDefaults {
  static DT: SettingsDT = {
    adjust_pitch: false,
    speed_change: 1.5,
  };
  static HT: SettingsHT = {
    adjust_pitch: false,
    speed_change: 0.75,
  };
  static CL: SettingsCL = {
    classic_health: true,
    classic_note_lock: true,
    fade_hit_circle_early: true,
    always_play_tail_sample: true,
    no_slider_head_accuracy: true,
  };
}
