import {OsuServer} from '../../../primitives/OsuServer';
import {SqlDbTable} from '../raw/db/SqlDbTable';
import {AppUser, AppUserKey} from '../raw/db/entities/AppUser';
import {AppUserInfo, AppUsersDao} from './AppUsersDao';

export class AppUsersDaoImpl implements AppUsersDao {
  private appUsersTable: SqlDbTable<AppUser, AppUserKey>;
  constructor(appUsersTable: SqlDbTable<AppUser, AppUserKey>) {
    this.appUsersTable = appUsersTable;
  }
  async get(id: string, server: OsuServer): Promise<AppUserInfo | undefined> {
    const appUser = await this.appUsersTable.get({
      id: id,
      server: server,
    });
    if (appUser === undefined) {
      return undefined;
    }
    return {
      id: appUser.id,
      server: appUser.server,
      osuId: appUser.osu_id,
      username: appUser.username,
      ruleset: appUser.ruleset,
    };
  }
  async addOrUpdate(appUser: AppUserInfo): Promise<void> {
    const appUserInfo: AppUser = {
      id: appUser.id,
      server: appUser.server,
      osu_id: appUser.osuId,
      username: appUser.username,
      ruleset: appUser.ruleset,
    };
    const existingAppUserInfo = await this.appUsersTable.get(
      appUserInfo as AppUserKey
    );
    if (existingAppUserInfo === undefined) {
      await this.appUsersTable.add(appUserInfo);
    } else {
      await this.appUsersTable.update(appUserInfo);
    }
  }
}
