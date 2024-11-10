import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type GetBeatmapsetDiffsResponse = {
  diffs: DiffInfo[] | undefined;
};

export type DiffInfo = {
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
};
