import {OsuServer} from '../../../../primitives/OsuServer';

export interface GetOsuUserInfoRequest {
  appUserId: string;
  server: OsuServer;
  username: string;
}
