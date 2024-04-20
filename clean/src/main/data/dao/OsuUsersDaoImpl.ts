import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUser, OsuUsersDao} from './OsuUsersDao';
import {OsuApi} from '../raw/http/OsuAPI';

export class OsuUsersDaoImpl implements OsuUsersDao {
  private apis: OsuApi[];
  constructor(apis: OsuApi[]) {
    this.apis = apis;
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
    return user;
  }
}
