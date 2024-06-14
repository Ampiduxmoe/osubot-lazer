import {Country} from '../common_types/Country';
import {UserCover} from '../common_types/UserCover';
import {ISO8601Timestamp} from '../common_types/ISO8601Timestamp';
import {Kudosu} from '../common_types/Kudosu';
import {Page} from '../common_types/Page';
import {Playmode} from '../common_types/Playmode';
import {PlaystyleString} from '../common_types/PlaystyleString';
import {ProfileBanner} from '../common_types/ProfileBanner';
import {ProfileSection} from '../common_types/ProfileSection';
import {RankHighest} from '../common_types/RankHighest';
import {RankHistory} from '../common_types/RankHistory';
import {ReplaysWatchedCount} from '../common_types/ReplaysWatchedCount';
import {UserAccountHistory} from '../common_types/UserAccountHistory';
import {UserAchievement} from '../common_types/UserAchievement';
import {UserBadge} from '../common_types/UserBadge';
import {UserGroup} from '../common_types/UserGroup';
import {UserMonthlyPlaycount} from '../common_types/UserMonthlyPlaycount';
import {UserStatistics} from '../common_types/UserStatistics';

// references:
// https://osu.ppy.sh/docs/index.html#get-user
// https://osu.ppy.sh/docs/index.html#userextended
// https://osu.ppy.sh/docs/index.html#user
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserTransformer.php
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Transformers/UserCompactTransformer.php
// https://github.com/ppy/osu-web/blob/59fc72974750e4ab0e721bd07e9b92155458f5a7/app/Models/User.php#L2430
export type UserExtended = {
  // attributes of base 'User'
  avatar_url: string;
  country_code: string;
  default_group: string | null;
  id: number;
  is_active: boolean;
  is_bot: boolean;
  is_deleted: boolean;
  is_online: boolean;
  is_supporter: boolean;
  last_visit: ISO8601Timestamp | null;
  pm_friends_only: boolean;
  profile_colour: string | null;
  username: string;

  // additional attributes of 'UserExtended'
  cover_url: string;
  discord: string | null;
  has_supported: boolean;
  interests: string | null;
  join_date: ISO8601Timestamp;
  location: string | null;
  max_blocks: number;
  max_friends: number;
  occupation: string | null;
  playmode: Playmode;
  playstyle: PlaystyleString | null; // for null possibility see ref.: User.php#L2430
  post_count: number;
  profile_order: ProfileSection[];
  title: string | null;
  title_url: string | null;
  twitter: string | null;
  website: string | null;

  // included optional 'User' fields for https://osu.ppy.sh/docs/index.html#userextended
  country: Country;
  cover: UserCover;
  kudosu: Kudosu;
  /** Present only if this is the currently authenticated user */
  is_restricted?: boolean;

  // included optional 'User' fields for [GET /users/{user}/{mode?}]
  // https://osu.ppy.sh/docs/index.html#get-user
  account_history: UserAccountHistory;
  active_tournament_banners: ProfileBanner[]; // not in docs but in responses
  badges: UserBadge[];
  beatmap_playcounts_count: number;
  favourite_beatmapset_count: number;
  follower_count: number;
  graveyard_beatmapset_count: number;
  groups: UserGroup[];
  loved_beatmapset_count: number;
  mapping_follower_count: number;
  monthly_playcounts: UserMonthlyPlaycount[];
  page: Page;
  pending_beatmapset_count: number;
  previous_usernames: string[];
  rank_highest: RankHighest | null;
  rank_history: RankHistory | null;
  ranked_beatmapset_count: number;
  replays_watched_counts: ReplaysWatchedCount[];
  scores_best_count: number;
  scores_first_count: number;
  scores_recent_count: number;
  statistics: UserStatistics;
  support_level: number;
  user_achievements: UserAchievement;

  // following optional fields that should be included but they are not:
  // statistics.country_rank
  // statistics.variants

  // deprecated: https://osu.ppy.sh/docs/index.html#breaking-changes
  // ranked_and_approved_beatmapset_count (now ranked_beatmapset_count)
  // unranked_beatmapset_count (now pending_beatmapset_count)
};
