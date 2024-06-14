import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUserSnapshots} from '../persistence/db/tables/OsuUserSnapshots';
import {
  CachedOsuUser,
  CachedOsuUsersDao,
} from '../../application/requirements/dao/CachedOsuUsersDao';

export class CachedOsuUsersDaoImpl implements CachedOsuUsersDao {
  private osuUserSnapshotsTable: OsuUserSnapshots;
  constructor(osuUserSnapshotsTable: OsuUserSnapshots) {
    this.osuUserSnapshotsTable = osuUserSnapshotsTable;
  }
  async get(
    username: string,
    server: OsuServer
  ): Promise<CachedOsuUser | undefined> {
    const userSnapshot = await this.osuUserSnapshotsTable.get({
      username: username,
      server: server,
    });
    if (userSnapshot === undefined) {
      return undefined;
    }
    return {
      username: userSnapshot.username,
      server: userSnapshot.server,
      id: userSnapshot.id,
      preferredMode: userSnapshot.preferred_mode,
    };
  }
}
