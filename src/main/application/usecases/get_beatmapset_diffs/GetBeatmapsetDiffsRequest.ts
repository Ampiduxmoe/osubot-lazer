import {OsuServer} from '../../../primitives/OsuServer';

export type GetBeatmapsetDiffsRequest = {
  initiatorAppUserId: string;
  server: OsuServer;
  beatmapsetId: number;
};
