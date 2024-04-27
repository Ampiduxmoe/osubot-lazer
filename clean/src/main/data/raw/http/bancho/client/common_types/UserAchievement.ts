import {ISO8601Timestamp} from './ISO8601Timestamp';

// references:
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserCompactTransformer.php#L439
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserAchievementTransformer.php
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Models/UserAchievement.php
export interface UserAchievement {
  achieved_at: ISO8601Timestamp;
  achievement_id: number;
}
