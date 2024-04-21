import {OsuServer} from '../../../primitives/OsuServer';
import {SqlDbTable} from '../raw/db/SqlDbTable';
import {AppUser, AppUserKey} from '../raw/db/entities/AppUser';
import {AppUsersDao} from './AppUsersDao';

export class AppUsersDaoImpl implements AppUsersDao {
  private appUsersTable: SqlDbTable<AppUser, AppUserKey>;
  constructor(appUsersTable: SqlDbTable<AppUser, AppUserKey>) {
    this.appUsersTable = appUsersTable;
  }
  async get(id: string, server: OsuServer): Promise<AppUser | undefined> {
    return await this.appUsersTable.get({
      id: id,
      server: server,
    });
  }
  async addOrUpdate(appUser: AppUser): Promise<void> {
    const existingAppUser = await this.appUsersTable.get(appUser as AppUserKey);
    if (existingAppUser === undefined) {
      await this.appUsersTable.add(appUser);
    } else {
      await this.appUsersTable.update(appUser);
    }
  }
}
