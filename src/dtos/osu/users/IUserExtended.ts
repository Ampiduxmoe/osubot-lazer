import {ICountry} from './ICountry';
import {ICover} from './ICover';
import {IKudosu} from './IKudosu';
import {IProfileBanner} from './IProfileBanner';
import {IUserAccountHistory} from './IUserAccountHistory';
import {IUserBadge} from './IUserBadge';
import {IUser} from './IUser';
import {IUserGroup} from './IUserGroup';
import {IUserMonthlyPlaycount} from './IUserMonthlyPlaycount';
import {IPage} from './IPage';
import {IRankHighest} from './IRankHighest';
import {IRankHistory} from './IRankHistory';
import {IReplayWatchCount} from './IReplayWatchCount';
import {IUserStatistics} from './IUserStatistics';
import {IUserAchievement} from './IUserAchievement';

export interface IUserExtended extends IUser {
  cover_url: string;
  discord: string | null;
  has_supported: boolean;
  interests: string | null;
  join_date: string;
  location: string | null;
  max_blocks: number;
  max_friends: number;
  occupation: string | null;
  playmode: string;
  playstyle: string[];
  post_count: number;
  profile_order: string[];
  title: string | null;
  title_url: string | null;
  twitter: string | null;
  website: string | null;

  // included optional fields from non-extended "User" (as per docs)
  country: ICountry;
  cover: ICover;
  kudosu: IKudosu;

  // included optional fields for https://osu.ppy.sh/api/v2/users endpoint (as per docs)
  account_history: IUserAccountHistory;
  active_tournament_banner: IProfileBanner | null;
  active_tournament_banners: IProfileBanner[]; // not in docs but in responses
  badges: IUserBadge[];
  beatmap_playcounts_count: number;
  favourite_beatmapset_count: number;
  follower_count: number;
  graveyard_beatmapset_count: number;
  groups: IUserGroup[];
  loved_beatmapset_count: number;
  mapping_follower_count: number;
  monthly_playcounts: IUserMonthlyPlaycount[];
  page: IPage;
  pending_beatmapset_count: number;
  previous_usernames: string[];
  rank_highest: IRankHighest | null;
  rank_history: IRankHistory;
  ranked_beatmapset_count: number;
  ranked_and_approved_beatmapset_count: number; // is not in docs but in responses
  unranked_beatmapset_count: number; // is not in docs but in responses
  replays_watched_counts: IReplayWatchCount[];
  scores_best_count: number;
  scores_first_count: number;
  scores_recent_count: number;
  statistics: IUserStatistics;
  // statistics.variants: // what is variants? nothing like this in responses
  support_level: number;
  user_achievements: IUserAchievement;
}
