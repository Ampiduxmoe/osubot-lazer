import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';

export type AppUserInfo = {
  id: string;
  server: OsuServer;
  osuId: number;
  username: string;
  ruleset: OsuRuleset;
};

export interface AppUsersDao {
  get(id: string, server: OsuServer): Promise<AppUserInfo | undefined>;
  addOrUpdate(appUser: AppUserInfo): Promise<void>;
}
