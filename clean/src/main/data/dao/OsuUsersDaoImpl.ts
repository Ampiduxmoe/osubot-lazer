import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUser, OsuUsersDao} from './OsuUsersDao';
import {OsuApi} from '../raw/http/OsuAPI';
import {SqlDbTable} from '../raw/db/SqlDbTable';
import {
  OsuIdAndUsername,
  OsuIdAndUsernameKey,
} from '../raw/db/entities/OsuIdAndUsername';

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
    server: OsuServer
  ): Promise<OsuUser | undefined> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    const user = await api.getUser(username);
    if (user === undefined) {
      return undefined;
    }
    const osuUser = user as OsuUser;
    osuUser.server = server;
    await this.cacheUserId(osuUser);
    return osuUser;
  }
  private async cacheUserId(osuUser: OsuUser): Promise<void> {
    const newOsuIdAndUsername: OsuIdAndUsername = {
      username: osuUser.username,
      server: osuUser.server,
      id: osuUser.id,
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
