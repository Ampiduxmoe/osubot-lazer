import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export type GetBeatmapInfoResponse = {
  beatmapInfo: MapInfo | undefined;
};

export type MapInfo = {
  id: number;
  beatmapsetId: number;
  mode: OsuRuleset;
  starRating: number;
  totalLength: number;
  hitLength: number;
  maxCombo: number;
  version: string;
  ar: number;
  cs: number;
  od: number;
  hp: number;
  bpm: number;
  playcount: number;
  url: string;
  beatmapset: {
    id: number;
    artist: string;
    title: string;
    bpm: number;
    creator: string;
    status: BeatmapsetRankStatus;
    playCount: number;
    favouriteCount: number;
    coverUrl: string;
    previewUrl: string;
  };
};

export type BeatmapsetRankStatus =
  | 'Graveyard'
  | 'Wip'
  | 'Pending'
  | 'Ranked'
  | 'Approved'
  | 'Qualified'
  | 'Loved';
