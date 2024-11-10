import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';

export interface OsuBeatmapsetsDao {
  get(
    appUserId: string,
    id: number,
    server: OsuServer
  ): Promise<OsuBeatmapset | undefined>;
}

export type OsuBeatmapset = {
  artist: string;
  coverUrl: string;
  creator: string;
  favouriteCount: number;
  id: number;
  playcount: number;
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
  beatmaps: {
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
    maxCombo: number;
  }[];
};
