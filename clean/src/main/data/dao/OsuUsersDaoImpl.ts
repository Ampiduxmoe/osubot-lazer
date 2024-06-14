import {OsuServer} from '../../../primitives/OsuServer';
import {
  OsuUser,
  OsuUsersDao,
} from '../../application/requirements/dao/OsuUsersDao';
import {OsuApi} from '../http/OsuAPI';
import {
  OsuUserSnapshot,
  OsuUserSnapshotKey,
} from '../persistence/db/entities/OsuUserSnapshot';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuUserInfo} from '../http/boundary/OsuUserInfo';
import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {OsuUserSnapshots} from '../persistence/db/tables/OsuUserSnapshots';
import {COMMON_REQUEST_SUBTARGETS} from './AppUserApiRequestsSummariesDaoImpl';

export class OsuUsersDaoImpl implements OsuUsersDao {
  private apis: OsuApi[];
  private osuUserSnapshotsTable: OsuUserSnapshots;
  private recentApiRequests: AppUserRecentApiRequestsDao;
  constructor(
    apis: OsuApi[],
    osuUserSnapshotsTable: OsuUserSnapshots,
    recentApiRequests: AppUserRecentApiRequestsDao
  ) {
    this.apis = apis;
    this.osuUserSnapshotsTable = osuUserSnapshotsTable;
    this.recentApiRequests = recentApiRequests;
  }
  async getByUsername(
    appUserId: string,
    username: string,
    server: OsuServer,
    ruleset: OsuRuleset | undefined
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
    const newSnapshot: OsuUserSnapshot = {
      username: osuUserInfo.username,
      server: server,
      id: osuUserInfo.id,
      preferred_mode: osuUserInfo.preferredMode,
    };
    const existingIdAndUsername = await this.osuUserSnapshotsTable.get(
      newSnapshot as OsuUserSnapshotKey
    );
    if (existingIdAndUsername === undefined) {
      await this.osuUserSnapshotsTable.add(newSnapshot);
    } else {
      await this.osuUserSnapshotsTable.update(newSnapshot);
    }
  }
}
