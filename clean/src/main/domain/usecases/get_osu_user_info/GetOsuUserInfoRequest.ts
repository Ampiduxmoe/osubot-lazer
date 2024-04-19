import {OsuServer} from '../../../../primitives/OsuServer';

export interface GetOsuUserInfoRequest {
  server: OsuServer;
  username: string;
}
