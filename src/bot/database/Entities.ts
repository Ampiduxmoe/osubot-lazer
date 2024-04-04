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

export interface OsuUserLight {
  osu_id: number;
  username: string;
  timestamp?: string;
}
