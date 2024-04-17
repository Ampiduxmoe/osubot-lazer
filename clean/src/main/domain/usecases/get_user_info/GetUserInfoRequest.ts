import {OsuServer} from '../../../../primitives/OsuServer';

export interface GetUserInfoRequest {
  server: OsuServer;
  username: string;
}
