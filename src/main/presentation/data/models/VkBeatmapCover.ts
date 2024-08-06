import {OsuServer} from '../../../primitives/OsuServer';

export type VkBeatmapCoverKey = {
  server: OsuServer;
  beatmapsetId: number;
};

export type VkBeatmapCover = VkBeatmapCoverKey & {
  attachment: string;
};
