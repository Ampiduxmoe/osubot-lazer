import {OsuServer} from '../../../primitives/OsuServer';
import {OsuIdsAndUsernames} from '../raw/db/tables/OsuIdsAndUsernames';
import {CachedOsuId, CachedOsuIdsDao} from './CachedOsuIdsDao';

export class CachedOsuIdsDaoImpl implements CachedOsuIdsDao {
  private osuIdsAndUsernamesTable: OsuIdsAndUsernames;
  constructor(osuIdsAndUsernamesTable: OsuIdsAndUsernames) {
    this.osuIdsAndUsernamesTable = osuIdsAndUsernamesTable;
  }
  async get(
    username: string,
    server: OsuServer
  ): Promise<CachedOsuId | undefined> {
    return await this.osuIdsAndUsernamesTable.get({
      username: username,
      server: server,
    });
  }
}
