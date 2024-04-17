import {OsuServer} from '../../../../primitives/OsuServer';
export interface GetRecentPlaysRequest {
  server: OsuServer;
  username: string;
  includeFails: boolean;
  offset: number;
  quantity: number;
}
