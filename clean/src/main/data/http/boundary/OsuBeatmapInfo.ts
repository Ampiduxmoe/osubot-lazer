import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export type OsuBeatmapInfo = {
  beatmapsetId: number;
  difficultyRating: number;
  id: number;
  mode: OsuRuleset;
  totalLength: number;
  userId: number;
  version: string;
  ar: number;
  cs: number;
  od: number;
  hp: number;
  bpm: number;
  convert: boolean;
  countCircles: number;
  countSliders: number;
  countSpinners: number;
  deletedAt: number | null;
  hitLength: number;
  lastUpdated: number;
  passcount: number;
  playcount: number;
  url: string;
  beatmapset: {
    artist: string;
    coverUrl: string;
    creator: string;
    favouriteCount: number;
    hype: number | null;
    id: number;
    nsfw: boolean;
    offset: number;
    playCount: number;
    previewUrl: string;
    source: string;
    spotlight: boolean;
    status:
      | 'graveyard'
      | 'wip'
      | 'pending'
      | 'ranked'
      | 'approved'
      | 'qualified'
      | 'loved';
    title: string;
    userId: number;
    video: boolean;
    bpm: number;
    deletedAt: number | null;
    lastUpdated: number;
    rankedDate: number;
    storyboard: boolean;
    submittedDate: number;
    tags: string;
    availability: {
      downloadDisabled: boolean;
      moreInformation: string | null;
    };
    ratings: number[];
  };
  failtimes: {
    fail: number[];
    exit: number[];
  };
  maxCombo: number;
};
