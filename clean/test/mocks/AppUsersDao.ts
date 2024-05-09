import {AppUser, AppUsersDao} from '../../src/main/data/dao/AppUsersDao';
import {OsuServer} from '../../src/primitives/OsuServer';

export class FakeAppUsersDao implements AppUsersDao {
  private appUsers = getFakeAppUsers();
  async get(id: string, server: OsuServer): Promise<AppUser | undefined> {
    return this.appUsers.find(u => u.id === id && u.server === server);
  }
  async addOrUpdate(appUser: AppUser): Promise<void> {
    this.appUsers = this.appUsers.filter(
      u => u.id === appUser.id && u.server === appUser.server
    );
    this.appUsers.push(appUser);
  }
}

const getFakeAppUsers: () => AppUser[] = () => [];
