export type RawScoreSimulationParamsOsu = {
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

export type RawScoreSimulationParamsOsuDt = RawScoreSimulationParamsOsu & {
  dt_rate: number;
};

export type RawScoreSimulationParamsOsuHt = RawScoreSimulationParamsOsu & {
  ht_rate: number;
};
