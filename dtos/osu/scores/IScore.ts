import {IBeatmapset} from '../beatmaps/IBeatmapset';
import {IUser} from '../users/IUser';
import {IScoreStatistics} from './IScoreStatistics';
import {IBeatmapExtended} from '../beatmaps/IBeatmapExtended';

export interface IScore {
  accuracy: number;
  best_id: number | null; // type? let's assume number for now
  created_at: string;
  id: number;
  max_combo: number;
  mode: string;
  mode_int: number;
  mods: string[];
  passed: boolean;
  perfect: boolean;
  pp: number | null;
  rank: string;
  replay: boolean;
  score: number;
  statistics: IScoreStatistics;
  type: string;
  user_id: number;
  current_user_attributes: {
    pin: unknown | null; // type?
  };
  // fields marked as optional in docs:
  /** Is always returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent as of now */
  beatmap?: IBeatmapExtended; // docs do not specify if it is "extended" but requests show it is
  rank_country?: number;
  rank_global?: number;
  weight?: number;
  /** Is always returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent as of now */
  beatmapset?: IBeatmapset;
  /** Is always returned by https://osu.ppy.sh/api/v2/users/{user_id}/scores/recent as of now */
  user?: IUser;
  match?: unknown; // type?
}
