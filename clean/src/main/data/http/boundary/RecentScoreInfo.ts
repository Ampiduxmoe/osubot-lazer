import {ModAcronym} from '../../../../primitives/ModAcronym';

export type RecentScoreInfo = {
  id: number;
  userId: number;
  mods: {
    acronym: ModAcronym;
    settings?: object;
  }[];
  statistics: {
    great?: number; // osu300, taiko300, ctb300, mania300
    ok?: number; // osu100, taiko100, mania100
    meh?: number; // osu50, mania50
    miss?: number; // osuMiss, taikoMiss, ctbMiss, maniaMiss
    largeTickHit?: number; // ctb banana or something
    smallTickHit?: number; // ctb small fruit or something
    smallTickMiss?: number; // ctb small fruit miss or something
    perfect?: number; // maniaPerfect300
    good?: number; // mania200
  };
  rank: 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  accuracy: number;
  startedAt: string | null;
  endedAt: string;
  isPerfectCombo: boolean;
  maxCombo: number;
  passed: boolean;
  pp: number | null;
  totalScore: number;
  beatmap: {
    id: number;
    userId: number;
    version: string;
    totalLength: number;
    hitLength: number;
    difficultyRating: number;
    bpm: number;
    ar: number;
    cs: number;
    od: number;
    hp: number;
    countCircles: number;
    countSliders: number;
    countSpinners: number;
    url: string;
  };
  beatmapset: {
    id: number;
    userId: number;
    creator: string;
    artist: string;
    title: string;
    coverUrl: string;
    status:
      | 'graveyard'
      | 'wip'
      | 'pending'
      | 'ranked'
      | 'approved'
      | 'qualified'
      | 'loved';
  };
  user: {
    id: number;
    username: string;
  };
};
