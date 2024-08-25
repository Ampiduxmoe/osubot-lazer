import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuServer} from '../../../primitives/OsuServer';

export type GetBeatmapInfoRequest = {
  initiatorAppUserId: string;
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
  mapScoreSimulationTaiko: {
    mods?: ModAcronym[];
    combo?: number;
    misses?: number;
    accuracy?: number;
    goods?: number;
    speed?: number;
    od?: number;
    hp?: number;
  };
};
