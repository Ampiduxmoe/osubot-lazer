import {ICountry} from './ICountry';
import {ICover} from './ICover';
import {IKudosu} from './IKudosu';
import {IPage} from './IPage';
import {IProfileBanner} from './IProfileBanner';
import {IRankHighest} from './IRankHighest';
import {IRankHistory} from './IRankHistory';
import {IReplayWatchCount} from './IReplayWatchCount';
import {IUserAccountHistory} from './IUserAccountHistory';
import {IUserAchievement} from './IUserAchievement';
import {IUserBadge} from './IUserBadge';
import {IUserGroup} from './IUserGroup';
import {IUserMonthlyPlaycount} from './IUserMonthlyPlaycount';
import {IUserStatistics} from './IUserStatistics';

export interface IUser {
  avatar_url: string;
  country_code: string;
  default_group: string | null;
  id: number;
  is_active: boolean;
  is_bot: boolean;
  is_deleted: boolean;
  is_online: boolean;
  is_supporter: boolean;
  last_visit: string | null;
  pm_friends_only: boolean;
  profile_colour: string | null;
  username: string;

  // fields that are included in "Extended user" (as per docs)
  country?: ICountry;
  cover?: ICover;
  is_restricted?: boolean;
  kudosu?: IKudosu;

  // optional fields that are included for https://osu.ppy.sh/api/v2/users endpoint (as per docs)
  account_history?: IUserAccountHistory;
  active_tournament_banner?: IProfileBanner | null;
  active_tournament_banners?: IProfileBanner[]; // not in docs but in responses
  badges?: IUserBadge[];
  beatmap_playcounts_count?: number;
  favourite_beatmapset_count?: number;
  follower_count?: number;
  graveyard_beatmapset_count?: number;
  groups?: IUserGroup[];
  loved_beatmapset_count?: number;
  mapping_follower_count?: number;
  monthly_playcounts?: IUserMonthlyPlaycount[];
  page?: IPage;
  pending_beatmapset_count?: number;
  previous_usernames?: string[];
  rank_highest?: IRankHighest | null;
  rank_history?: IRankHistory;
  ranked_beatmapset_count?: number;
  ranked_and_approved_beatmapset_count?: number; // is not in docs but in responses
  unranked_beatmapset_count?: number; // is not in docs but in responses
  replays_watched_counts?: IReplayWatchCount[];
  scores_best_count?: number;
  scores_first_count?: number;
  scores_recent_count?: number;
  statistics?: IUserStatistics;
  // statistics.variants: // what is variants? nothing like this in responses
  support_level?: number;
  user_achievements?: IUserAchievement;
}
