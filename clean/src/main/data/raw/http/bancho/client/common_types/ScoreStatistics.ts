// references:
// TODO when api docs are good
export interface ScoreStatisticsLazer extends ScoreStatisticsLegacy {
  /* Slider end? */
  ignore_hit?: number;
  /** Spinner bonus */
  large_bonus?: number;
  /** Spinner spin */
  small_bonus?: number;
  /** Slider tick */
  large_tick_hit?: number;
  /* Slider end? */
  small_tick_hit?: number;
  /* Slider end? */
  slider_tail_hit?: number;
  large_tick_miss?: number;
  small_tick_miss?: number;
}

export interface ScoreStatisticsLegacy {
  ok?: number;
  meh?: number;
  miss?: number;
  great?: number;
}
