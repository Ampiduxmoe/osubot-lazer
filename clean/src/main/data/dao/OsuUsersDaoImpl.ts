import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUser, OsuUsersDao} from './OsuUsersDao';
import {OsuApi} from '../raw/http/OsuAPI';
import {
  OsuIdAndUsername,
  OsuIdAndUsernameKey,
} from '../raw/db/entities/OsuIdAndUsername';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuUserInfo} from '../raw/http/boundary/OsuUserInfo';
import {
  AppUserRecentApiRequestsDao,
  COMMON_REQUEST_SUBTARGETS,
} from './AppUserRecentApiRequestsDao';
import {OsuIdsAndUsernames} from '../raw/db/tables/OsuIdsAndUsernames';

export class OsuUsersDaoImpl implements OsuUsersDao {
  private apis: OsuApi[];
  private osuIdsAndUsernamesTable: OsuIdsAndUsernames;
  private recentApiRequests: AppUserRecentApiRequestsDao;
  constructor(
    apis: OsuApi[],
    osuIdsAndUsernamesTable: OsuIdsAndUsernames,
    recentApiRequests: AppUserRecentApiRequestsDao
  ) {
    this.apis = apis;
    this.osuIdsAndUsernamesTable = osuIdsAndUsernamesTable;
    this.recentApiRequests = recentApiRequests;
  }
  async getByUsername(
    appUserId: string,
    username: string,
    server: OsuServer,
    ruleset: OsuRuleset
  ): Promise<OsuUser | undefined> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    await this.recentApiRequests.add({
      time: Date.now(),
      appUserId: appUserId,
      target: OsuServer[api.server],
      subtarget: COMMON_REQUEST_SUBTARGETS.osuUserInfo,
      count: 1,
    });
    const userInfo = await api.getUser(username, ruleset);
    if (userInfo === undefined) {
      return undefined;
    }
    await this.cacheUserId(userInfo, server);
    return userInfo as OsuUser;
  }
  private async cacheUserId(
    osuUserInfo: OsuUserInfo,
    server: OsuServer
  ): Promise<void> {
    const newOsuIdAndUsername: OsuIdAndUsername = {
      username: osuUserInfo.username,
      server: server,
      id: osuUserInfo.id,
    };
    const existingIdAndUsername = await this.osuIdsAndUsernamesTable.get(
      newOsuIdAndUsername as OsuIdAndUsernameKey
    );
    if (existingIdAndUsername === undefined) {
      await this.osuIdsAndUsernamesTable.add(newOsuIdAndUsername);
    } else {
      await this.osuIdsAndUsernamesTable.update(newOsuIdAndUsername);
    }
  }
}
