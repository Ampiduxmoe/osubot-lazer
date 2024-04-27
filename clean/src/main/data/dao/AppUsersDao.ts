import {OsuServer} from '../../../primitives/OsuServer';
import {AppUserInfo} from '../raw/db/entities/AppUserInfo';

export type AppUser = AppUserInfo;

export interface AppUsersDao {
  get(id: string, server: OsuServer): Promise<AppUser | undefined>;
  addOrUpdate(appUser: AppUser): Promise<void>;
}
