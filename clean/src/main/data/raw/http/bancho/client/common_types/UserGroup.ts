import {Group} from './Group';
import {Playmode} from './Playmode';

// references:
// https://osu.ppy.sh/docs/index.html#usergroup
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Models/UserGroup.php#L49 (though not a direct confirmation for 'Playmode')
export type UserGroup = Group & {
  playmodes: Playmode[] | null;
};
