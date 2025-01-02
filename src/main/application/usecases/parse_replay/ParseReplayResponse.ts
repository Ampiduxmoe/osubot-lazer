import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type ParseReplayResponse = {
  isFailure: boolean;
  replay?: ReplayInfo;
};

export type ReplayInfo = {
  mode: OsuRuleset;
  version: number;
  beatmapHash: string;
  playerName: string;
  replayHash: string;
  hitcounts: ReplayHitcounts;
  score: number;
  combo: number;
  perfect: number;
  accuracy: number;
  mods: ModAcronym[];
};

export type ReplayHitcounts = {
  c300: number;
  c100: number;
  c50: number;
  miss: number;
  geki: number;
  katu: number;
};
