import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';

export interface CachedOsuUsersDao {
  get(username: string, server: OsuServer): Promise<CachedOsuUser | undefined>;
}

export type CachedOsuUser = {
  username: string;
  server: OsuServer;
  id: number;
  preferredMode: OsuRuleset;
};
