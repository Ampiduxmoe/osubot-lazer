import {OsuServer} from '../../../../primitives/OsuServer';

export interface SetUsernameRequest {
  id: string;
  server: OsuServer;
  username: string;
}
