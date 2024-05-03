export interface RawScoreSimulationParams {
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
}

export interface RawScoreSimulationParamsDt extends RawScoreSimulationParams {
  dt_rate: number;
}

export interface RawScoreSimulationParamsHt extends RawScoreSimulationParams {
  ht_rate: number;
}
