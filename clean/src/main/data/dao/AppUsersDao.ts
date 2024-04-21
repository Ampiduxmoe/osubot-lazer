import {OsuServer} from '../../../primitives/OsuServer';
import {AppUser} from '../raw/db/entities/AppUser';

export interface AppUsersDao {
  get(id: string, server: OsuServer): Promise<AppUser | undefined>;
  addOrUpdate(appUser: AppUser): Promise<void>;
}
