import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUser, OsuUsersDao} from './OsuUsersDao';
import {OsuApi} from '../raw/http/OsuAPI';
import {SqlDbTable} from '../raw/db/SqlDbTable';
import {
  OsuIdAndUsername,
  OsuIdAndUsernameKey,
} from '../raw/db/entities/OsuIdAndUsername';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuUserInfo} from '../raw/http/boundary/OsuUserInfo';

export class OsuUsersDaoImpl implements OsuUsersDao {
  private apis: OsuApi[];
  private osuIdsAndUsernamesTable: SqlDbTable<
    OsuIdAndUsername,
    OsuIdAndUsernameKey
  >;
  constructor(
    apis: OsuApi[],
    osuIdsAndUsernamesTable: SqlDbTable<OsuIdAndUsername, OsuIdAndUsernameKey>
  ) {
    this.apis = apis;
    this.osuIdsAndUsernamesTable = osuIdsAndUsernamesTable;
  }
  async getByUsername(
    username: string,
    server: OsuServer,
    ruleset: OsuRuleset
  ): Promise<OsuUser | undefined> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
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
