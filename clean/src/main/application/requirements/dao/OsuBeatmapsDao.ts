import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../primitives/OsuServer';

export interface OsuBeatmapsDao {
  get(
    appUserId: string,
    id: number,
    server: OsuServer
  ): Promise<OsuBeatmap | undefined>;
}

export type OsuBeatmap = {
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
  countCircles: number;
  countSliders: number;
  countSpinners: number;
  hitLength: number;
  playcount: number;
  url: string;
  beatmapset: {
    artist: string;
    coverUrl: string;
    creator: string;
    favouriteCount: number;
    id: number;
    playCount: number;
    previewUrl: string;
    status:
      | 'Graveyard'
      | 'Wip'
      | 'Pending'
      | 'Ranked'
      | 'Approved'
      | 'Qualified'
      | 'Loved';
    title: string;
    userId: number;
    bpm: number;
  };
  maxCombo: number;
};
