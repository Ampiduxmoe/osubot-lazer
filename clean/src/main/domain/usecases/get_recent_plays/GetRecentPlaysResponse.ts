import {OsuServer} from '../../../../primitives/OsuServer';

export interface GetRecentPlaysResponse {
  server: OsuServer;
  user: string;
  scores: string[];
}