// references:
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserTransformer.php#L48
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Models/UserProfileCustomization.php#L42
export type ProfileSection =
  | 'me'
  | 'recent_activity'
  | 'top_ranks'
  | 'medals'
  | 'historical'
  | 'beatmaps'
  | 'kudosu';
