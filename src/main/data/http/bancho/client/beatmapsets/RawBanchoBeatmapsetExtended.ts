import {ISO8601Timestamp} from '../common_types/ISO8601Timestamp';
import {Playmode} from '../common_types/Playmode';
import {MapStatus} from '../common_types/MapStatus';
import {BeatmapsetCovers} from '../common_types/BeatmapsetCovers';

export type RawBanchoBeatmapsetExtended = {
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
  bpm: number;
  can_be_hyped: boolean;
  deleted_at: ISO8601Timestamp | null;
  discussion_locked: boolean;
  is_scoreable: boolean;
  last_updated: ISO8601Timestamp;
  legacy_thread_url: string;
  nominations_summary: {
    current: number;
    eligible_main_rulesets: Playmode[];
    required_meta: {
      main_ruleset: number;
      non_main_ruleset: number;
    };
  };
  ranked: number;
  ranked_date: ISO8601Timestamp;
  storyboard: boolean;
  submitted_date: ISO8601Timestamp;
  tags: string;
  availability: {
    download_disabled: boolean;
    more_information: string | null;
  };
  beatmaps: {
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
    failtimes: {
      fail: number[];
      exit: number[];
    };
    max_combo: number;
  }[];
  converts: unknown;
  current_nominations: unknown;
  description: unknown;
  genre: unknown;
  language: unknown;
  pack_tags: unknown;
  ratings: number[];
  recent_favourites: unknown;
  relates_users: unknown;
  user: unknown;

  // deprecated:
  discussion_enabled: true;
};
