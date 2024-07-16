import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type GetBeatmapInfoResponse = {
  beatmapInfo: MapInfo | undefined;
};

export type MapInfo = {
  id: number;
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
    creator: string;
    status: BeatmapsetRankStatus;
    playcount: number;
    favouriteCount: number;
    coverUrl: string;
    previewUrl: string;
  };
  ppEstimations: {
    accuracy: number;
    ppValue: number | undefined;
  }[];
  simulationParams:
    | undefined
    | {
        mods: ModAcronym[];
        combo: number;
        accuracy: number;
        speed?: number;
        misses: number;
        mehs: number;
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
