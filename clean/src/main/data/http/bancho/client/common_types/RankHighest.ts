import {ISO8601Timestamp} from './ISO8601Timestamp';

// references:
// https://osu.ppy.sh/docs/index.html#user-rankhighest
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserCompactTransformer.php#L352
// https://github.com/ppy/osu-web/blob/0444f7772623f3ee4941065da7bdb0e29adfbe01/app/Transformers/RankHighestTransformer.php
export type RankHighest = {
  rank: number;
  updated_at: ISO8601Timestamp;
};
