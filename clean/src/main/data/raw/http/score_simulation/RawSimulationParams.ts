export interface RawScoreSimulationParams {
  beatmap_id: number;
  mods: string[];
  combo: number | null;
  misses: number;
  mehs: number;
  goods: number;
}
