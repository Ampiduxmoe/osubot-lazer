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
