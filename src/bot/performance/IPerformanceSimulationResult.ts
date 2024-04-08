export interface IPerformanceSimulationResult {
  score: {
    ruleset_id: number;
    beatmap_id: number;
    beatmap: string;
    mods: {acronym: string}[];
    total_score: number;
    legacy_total_score: number;
    accuracy: number;
    combo: number;
    statistics: {
      great: number;
      ok: number;
      meh: number;
      miss: number;
    };
  };
  performance_attributes: {
    aim: number;
    speed: number;
    accuracy: number;
    flashlight: number;
    effective_miss_count: number;
    pp: number;
  };
  difficulty_attributes: {
    star_rating: number;
    max_combo: number;
    aim_difficulty: number;
    speed_difficulty: number;
    speed_note_count: number;
    slider_factor: number;
    approach_rate: number;
    overall_difficulty: number;
  };
}
