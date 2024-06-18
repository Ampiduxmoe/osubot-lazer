import {OsuServer} from '../../../primitives/OsuServer';
import {AppUser, AppUserKey} from '../repository/models/AppUser';
import {
  AppUserInfo,
  AppUsersDao,
} from '../../application/requirements/dao/AppUsersDao';
import {AppUsersRepository} from '../repository/repositories/AppUsersRepository';

export class AppUsersDaoImpl implements AppUsersDao {
  private appUsersTable: AppUsersRepository;
  constructor(appUsersTable: AppUsersRepository) {
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
      osuId: appUser.osuId,
      username: appUser.username,
      ruleset: appUser.ruleset,
    };
  }
  async addOrUpdate(appUserInfo: AppUserInfo): Promise<void> {
    const appUser: AppUser = {
      id: appUserInfo.id,
      server: appUserInfo.server,
      osuId: appUserInfo.osuId,
      username: appUserInfo.username,
      ruleset: appUserInfo.ruleset,
    };
    const existingAppUserInfo = await this.appUsersTable.get(
      appUser as AppUserKey
    );
    if (existingAppUserInfo === undefined) {
      await this.appUsersTable.add(appUser);
    } else {
      await this.appUsersTable.update(appUser);
    }
  }
}
