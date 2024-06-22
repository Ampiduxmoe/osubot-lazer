import {OsuServer} from '../../../../primitives/OsuServer';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {ModAcronym} from '../../../../primitives/ModAcronym';

export interface OsuUserRecentScoresDao {
  get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    includeFails: boolean,
    mods: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[],
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserRecentScore[]>;
}

export type OsuUserRecentScore = {
  id: number;
  absolutePosition: number;
  userId: number;
  mods: {
    acronym: ModAcronym;
    settings?: {
      // HT, DC, DT, NC:
      speedChange?: number;
      adjustPitch?: boolean;
      // DA:
      ar?: number;
      cs?: number;
      od?: number;
      hp?: number;
      // EZ:
      retries?: number;
      // TP
      seed?: number;
      metronome?: boolean;
    };
  }[];
  maximumStatistics: {
    great?: number;
    perfect?: number;
    legacyComboIncrease?: number;
    ignoreHit?: number;
    largeBonus?: number;
    smallBonus?: number;
    largeTickHit?: number;
    smallTickHit?: number;
    sliderTailHit?: number;
  };
  statistics: {
    great?: number; // osu300, taiko300, ctb300, mania300
    ok?: number; // osu100, taiko100, mania100
    meh?: number; // osu50, mania50
    miss?: number; // osuMiss, taikoMiss, ctbMiss, maniaMiss
    largeTickHit?: number; // ctb banana or something
    largeTickMiss?: number; // ctb banana or something
    smallTickHit?: number; // ctb small fruit or something
    smallTickMiss?: number; // ctb small fruit miss or something
    perfect?: number; // maniaPerfect300
    good?: number; // mania200
  };
  rank: 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  accuracy: number;
  endedAt: string;
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
      | 'Graveyard'
      | 'Wip'
      | 'Pending'
      | 'Ranked'
      | 'Approved'
      | 'Qualified'
      | 'Loved';
  };
  user: {
    id: number;
    username: string;
  };
};
