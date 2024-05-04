import {OsuServer} from '../../../../primitives/OsuServer';
export interface GetRecentPlaysRequest {
  server: OsuServer;
  username: string;
  includeFails: boolean;
  startPosition: number;
  quantity: number;
  mods: {
    acronym: string;
    isOptional: boolean;
  }[];
}
