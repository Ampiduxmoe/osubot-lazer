// references:
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserCompactTransformer.php#L380
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserReplaysWatchedCountTransformer.php
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Models/UserReplaysWatchedCount.php
export type ReplaysWatchedCount = {
  /** Date written as YYYY-MM-01 */
  start_date: string;
  count: number;
};
