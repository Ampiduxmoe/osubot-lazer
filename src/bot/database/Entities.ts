export interface BeatmapCoverDbObject {
  beatmapset_id: number;
  attachment: string;
}

export interface UserDbObject {
  vk_id: number;
  osu_id: number;
  username: string;
  mode: number;
}

export interface UserStatsDbObject {
  osu_id: number;
  username: string;
  pp: number;
  rank: number;
  accuracy: number;
}

export interface CachedUserDbObject {
  osu_id: number;
  username: string;
  timestamp?: string;
}

export interface CachedBeatmapsetDbObject {
  beatmapset_id: number;
  artist: string;
  title: string;
  creator: string;
  timestamp?: string;
}

export interface CachedChatBeatmapDbObject {
  peer_id: number;
  beatmap_id: number;
}

export interface CachedJsonDbObject {
  object_name: string;
  json_string: string;
}
