import {RecentPlayServer} from './BoundaryTypes';
export interface GetRecentPlaysResponse {
  server: RecentPlayServer;
  user: string;
  scores: string[];
}
