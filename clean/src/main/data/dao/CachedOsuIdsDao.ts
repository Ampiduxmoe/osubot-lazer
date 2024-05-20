import {OsuServer} from '../../../primitives/OsuServer';

export interface CachedOsuIdsDao {
  get(username: string, server: OsuServer): Promise<CachedOsuId | undefined>;
}

export type CachedOsuId = {
  server: OsuServer;
  username: string;
  id: number;
};
