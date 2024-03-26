import {ICovers} from './ICovers';

export interface IBeatmapset {
  artist: string;
  artist_unicode: string;
  covers: ICovers;
  creator: string;
  favourite_count: number;
  id: number;
  nsfw: boolean;
  offset: number;
  play_count: number;
  preview_url: string;
  source: string;
  spotlight: boolean;
  status: string;
  title: string;
  title_unicode: string;
  user_id: number;
  video: boolean;
  // fields marked as optional in docs:
  track_id?: number;
  // other_fields?: ...

  // hype: null, // this should be in "BeatmapsetExtended" type but test request shows otherwise
}
