// references:
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserCompactTransformer.php#L204
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Libraries/User/Cover.php
export interface UserCover {
  custom_url: string | null;
  url: string;
  id: string | null;
}
