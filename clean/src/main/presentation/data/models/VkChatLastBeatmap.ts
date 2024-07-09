import {OsuServer} from '../../../../primitives/OsuServer';

export type VkChatLastBeatmapKey = {
  peerId: number;
  server: OsuServer;
};

export type VkChatLastBeatmap = VkChatLastBeatmapKey & {
  beatmapId: number;
};
