import {IBeatmap} from './IBeatmap';
import {IBeatmapset} from './IBeatmapset';

export interface IBeatmapExtended extends IBeatmap {
  accuracy: number;
  ar: number;
  bpm: number | null;
  convert: boolean;
  count_circles: number;
  count_sliders: number;
  count_spinners: number;
  cs: number;
  deleted_at: string | null;
  drain: number;
  hit_length: number;
  is_scoreable: boolean;
  last_updated: string;
  mode_int: number;
  passcount: number;
  playcount: number;
  ranked: number;
  url: string;
  beatmapset: IBeatmapset; // should be IBeatmapSetExtended
}
