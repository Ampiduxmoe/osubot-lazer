import {OsuServer} from '../../../../primitives/OsuServer';

export interface SetUsernameRequest {
  appUserId: string;
  server: OsuServer;
  username: string;
}
