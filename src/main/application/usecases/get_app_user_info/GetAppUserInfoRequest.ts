import {OsuServer} from '../../../primitives/OsuServer';

export type GetAppUserInfoRequest = {
  id: string;
  server: OsuServer;
};
