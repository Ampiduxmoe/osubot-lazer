import {OsuServer} from '../../../primitives/OsuServer';

export type UnlinkUsernameRequest = {
  appUserId: string;
  server: OsuServer;
};
