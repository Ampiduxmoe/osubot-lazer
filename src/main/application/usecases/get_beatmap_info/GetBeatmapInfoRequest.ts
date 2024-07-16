import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuServer} from '../../../primitives/OsuServer';

export type GetBeatmapInfoRequest = {
  appUserId: string;
  server: OsuServer;
  beatmapId: number;
  mapScoreSimulationOsu: {
    mods?: ModAcronym[];
    combo?: number;
    misses?: number;
    accuracy?: number;
    mehs?: number;
    goods?: number;
    speed?: number;
    ar?: number;
    cs?: number;
    od?: number;
    hp?: number;
  };
};
