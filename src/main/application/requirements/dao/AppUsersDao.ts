import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';

export interface AppUsersDao {
  get(id: string, server: OsuServer): Promise<AppUserInfo | undefined>;
  addOrUpdate(appUserInfo: AppUserInfo): Promise<void>;
  delete(id: string, server: OsuServer): Promise<void>;
}

export type AppUserInfo = {
  id: string;
  server: OsuServer;
  osuId: number;
  username: string;
  ruleset: OsuRuleset;
};
