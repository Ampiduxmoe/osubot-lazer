import {RecentPlayServer} from './BoundaryTypes';
export interface GetRecentPlaysRequest {
  server: RecentPlayServer;
  username: string;
  includeFails: boolean;
  offset: number;
  quantity: number;
}
