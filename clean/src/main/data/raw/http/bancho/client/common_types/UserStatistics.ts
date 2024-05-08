// references:
// https://osu.ppy.sh/docs/index.html#userstatistics
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserCompactTransformer.php#L416
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Models/User.php#L191
export type UserStatistics = {
  count_100: number;
  count_300: number;
  count_50: number;
  count_miss: number;
  country_rank?: number | null;
  grade_counts: {
    ss: number;
    ssh: number;
    s: number;
    sh: number;
    a: number;
  };
  hit_accuracy: number;
  is_ranked: boolean;
  level: {
    current: number;
    progress: number;
  };
  maximum_combo: number;
  play_count: number;
  play_time: number;
  pp: number;
  pp_exp: number;
  global_rank: number | null;
  global_rank_exp: number | null;
  ranked_score: number;
  replays_watched_by_others: number;
  total_score: number;
  total_hits: number;
  rank: {
    country: number | null;
  };
  // TODO: mania variants (https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Models/UserStatistics/Mania4k.php)
  // variants?: {}[]
};
