import {OsuServer} from '../../../primitives/OsuServer';
import {SqlDbTable} from '../raw/db/SqlDbTable';
import {
  OsuIdAndUsername,
  OsuIdAndUsernameKey,
} from '../raw/db/entities/OsuIdAndUsername';
import {CachedOsuId, CachedOsuIdsDao} from './CachedOsuIdsDao';

export class CachedOsuIdsDaoImpl implements CachedOsuIdsDao {
  private osuIdsAndUsernamesTable: SqlDbTable<
    OsuIdAndUsername,
    OsuIdAndUsernameKey
  >;
  constructor(
    osuIdsAndUsernamesTable: SqlDbTable<OsuIdAndUsername, OsuIdAndUsernameKey>
  ) {
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
