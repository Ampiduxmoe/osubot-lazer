import {OsuServer} from '../../../../primitives/OsuServer';

export type GetBeatmapInfoRequest = {
  appUserId: string;
  server: OsuServer;
  beatmapId: number;
};
