import {OsuServer} from '../../../primitives/OsuServer';
import {SqlDbTable} from '../raw/db/SqlDbTable';
import {AppUserInfo, AppUserInfoKey} from '../raw/db/entities/AppUserInfo';
import {AppUser, AppUsersDao} from './AppUsersDao';

export class AppUsersDaoImpl implements AppUsersDao {
  private appUsersTable: SqlDbTable<AppUserInfo, AppUserInfoKey>;
  constructor(appUsersTable: SqlDbTable<AppUserInfo, AppUserInfoKey>) {
    this.appUsersTable = appUsersTable;
  }
  async get(id: string, server: OsuServer): Promise<AppUser | undefined> {
    return await this.appUsersTable.get({
      id: id,
      server: server,
    });
  }
  async addOrUpdate(appUser: AppUser): Promise<void> {
    const appUserInfo: AppUserInfo = {
      id: appUser.id,
      server: appUser.server,
      osu_id: appUser.osu_id,
      username: appUser.username,
      ruleset: appUser.ruleset,
    };
    const existingAppUserInfo = await this.appUsersTable.get(
      appUserInfo as AppUserInfoKey
    );
    if (existingAppUserInfo === undefined) {
      await this.appUsersTable.add(appUserInfo);
    } else {
      await this.appUsersTable.update(appUserInfo);
    }
  }
}
