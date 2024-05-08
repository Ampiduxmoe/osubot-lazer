export type RawScoreSimulationParams = {
  beatmap_id: number;
  mods: string[];
  combo: number | null;
  misses: number;
  mehs: number;
  goods: number;
  da_settings?: {
    ar?: number;
    cs?: number;
    od?: number;
    hp?: number;
  };
};

export type RawScoreSimulationParamsDt = RawScoreSimulationParams & {
  dt_rate: number;
};

export type RawScoreSimulationParamsHt = RawScoreSimulationParams & {
  ht_rate: number;
};
