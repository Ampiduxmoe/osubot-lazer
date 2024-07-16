import {OsuServer} from '../../primitives/OsuServer';
import {
  OsuUser,
  OsuUsersDao,
} from '../../application/requirements/dao/OsuUsersDao';
import {OsuApi} from '../http/OsuApi';
import {
  OsuUserSnapshot,
  OsuUserSnapshotKey,
} from '../repository/models/OsuUserSnapshot';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuUserInfo} from '../http/boundary/OsuUserInfo';
import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {COMMON_REQUEST_SUBTARGETS} from './AppUserApiRequestsSummariesDaoImpl';
import {OsuUserSnapshotsRepository} from '../repository/repositories/OsuUserSnapshotsRepository';

export class OsuUsersDaoImpl implements OsuUsersDao {
  private apis: OsuApi[];
  private osuUserSnapshotsRepository: OsuUserSnapshotsRepository;
  private recentApiRequests: AppUserRecentApiRequestsDao;
  constructor(
    apis: OsuApi[],
    osuUserSnapshotsRepository: OsuUserSnapshotsRepository,
    recentApiRequests: AppUserRecentApiRequestsDao
  ) {
    this.apis = apis;
    this.osuUserSnapshotsRepository = osuUserSnapshotsRepository;
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
      preferredMode: osuUserInfo.preferredMode,
    };
    const existingIdAndUsername = await this.osuUserSnapshotsRepository.get(
      newSnapshot as OsuUserSnapshotKey
    );
    if (existingIdAndUsername === undefined) {
      await this.osuUserSnapshotsRepository.add(newSnapshot);
    } else {
      await this.osuUserSnapshotsRepository.update(newSnapshot);
    }
  }
}
