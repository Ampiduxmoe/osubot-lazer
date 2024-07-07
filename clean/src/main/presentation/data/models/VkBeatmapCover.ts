export type VkBeatmapCoverKey = {
  beatmapsetId: number;
};

export type VkBeatmapCover = VkBeatmapCoverKey & {
  attachment: string;
};
