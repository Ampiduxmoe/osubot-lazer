import {Mode} from './Mode';

// references:
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserTransformer.php#L45
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Models/User.php#L2444
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Models/Beatmap.php#L65
export type Playmode = keyof typeof Mode;
