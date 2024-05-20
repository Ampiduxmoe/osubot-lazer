import {AppUserInfo, AppUsersDao} from '../../src/main/data/dao/AppUsersDao';
import {VkIdConverter} from '../../src/main/presentation/vk/VkIdConverter';
import {OsuRuleset} from '../../src/primitives/OsuRuleset';
import {OsuServer} from '../../src/primitives/OsuServer';
import {getFakeOsuUserUsername} from './OsuUsers';

export class FakeAppUsersDao implements AppUsersDao {
  private appUsers = getFakeAppUsers();
  async get(id: string, server: OsuServer): Promise<AppUserInfo | undefined> {
    return this.appUsers.find(u => u.id === id && u.server === server);
  }
  async addOrUpdate(appUser: AppUserInfo): Promise<void> {
    this.appUsers = this.appUsers.filter(
      u => u.id === appUser.id && u.server === appUser.server
    );
    this.appUsers.push(appUser);
  }
}

export const getFakeAppUsers: () => AppUserInfo[] = () => [
  ...[1, 2, 3, 4, 5].map(n => ({
    id: VkIdConverter.vkUserIdToAppUserId(n + 500000),
    server: OsuServer.Bancho,
    osuId: n,
    username: getFakeOsuUserUsername(n),
    ruleset: OsuRuleset.osu,
  })),
];
