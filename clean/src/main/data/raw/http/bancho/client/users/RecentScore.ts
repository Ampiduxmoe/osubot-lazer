import {MaximumStatistics} from '../common_types/MaximumStatistics';
import {Mod} from '../common_types/Mod';
import {ScoreGrade} from '../common_types/ScoreGrade';
import {ScoreStatistics} from '../common_types/ScoreStatistics';
import {ScoreType} from '../common_types/ScoreType';
import {ISO8601Timestamp} from '../common_types/ISO8601Timestamp';
import {Playmode} from '../common_types/Playmode';
import {MapStatus} from '../common_types/MapStatus';
import {BeatmapsetCovers} from '../common_types/BeatmapsetCovers';

// many attributes were 'eyeballed', so TODO revise this when oficial docs are good
export type RecentScore = {
  // if type is 'solo_score'
  ranked?: boolean;
  preserve?: boolean;
  processed?: boolean;

  // if score was done in multiplayer?
  playlist_item_id?: number;
  room_id?: number;
  solo_score_id?: number;

  maximum_statistics: MaximumStatistics;
  mods: Mod[];
  statistics: ScoreStatistics;
  beatmap_id: number;
  best_id: number | null;
  id: number;
  rank: ScoreGrade;
  type: ScoreType;
  user_id: number;
  accuracy: number;
  build_id: number | null;
  ended_at: ISO8601Timestamp;
  has_replay: boolean;
  is_perfect_combo: boolean;
  legacy_perfect: boolean;
  legacy_score_id: number | null;
  legacy_total_score: number;
  max_combo: number;
  passed: boolean;
  pp: number | null;
  ruleset_id: number;
  started_at: ISO8601Timestamp | null;
  total_score: number;
  /** Same as has_replay */ // https://github.com/ppy/osu-web/blob/0444f7772623f3ee4941065da7bdb0e29adfbe01/app/Transformers/ScoreTransformer.php#L137
  replay: boolean;
  current_user_attributes: unknown; // TODO when oficial docs are good
  beatmap: {
    beatmapset_id: number;
    difficulty_rating: number;
    id: number;
    mode: Playmode;
    status: MapStatus;
    total_length: number;
    user_id: number;
    version: string;
    accuracy: number;
    ar: number;
    bpm: number;
    convert: boolean;
    count_circles: number;
    count_sliders: number;
    count_spinners: number;
    cs: number;
    deleted_at: ISO8601Timestamp | null;
    drain: number;
    hit_length: number;
    is_scoreable: boolean;
    last_updated: ISO8601Timestamp;
    mode_int: number;
    passcount: number;
    playcount: number;
    ranked: number;
    url: string;
    checksum: string;
  };
  beatmapset: {
    artist: string;
    artist_unicode: string;
    covers: BeatmapsetCovers;
    creator: string;
    favourite_count: number;
    hype: number | null;
    id: number;
    nsfw: boolean;
    offset: number;
    play_count: number;
    preview_url: string;
    source: string;
    spotlight: boolean;
    status: MapStatus;
    title: string;
    title_unicode: string;
    track_id: number | null;
    user_id: number;
    video: boolean;
  };
  user: {
    avatar_url: string;
    country_code: string;
    default_group: string;
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
  };
};
