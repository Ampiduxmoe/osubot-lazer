import {OsuServer} from '../../../../primitives/OsuServer';

export interface GetAppUserInfoRequest {
  id: string;
  server: OsuServer;
}
