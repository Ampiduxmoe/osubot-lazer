import {OsuServer} from '../../../primitives/OsuServer';
import {
  CachedOsuUser,
  CachedOsuUsersDao,
} from '../../application/requirements/dao/CachedOsuUsersDao';
import {OsuUserSnapshotsRepository} from '../repository/repositories/OsuUserSnapshotsRepository';

export class CachedOsuUsersDaoImpl implements CachedOsuUsersDao {
  private osuUserSnapshotsRepository: OsuUserSnapshotsRepository;
  constructor(osuUserSnapshotsRepository: OsuUserSnapshotsRepository) {
    this.osuUserSnapshotsRepository = osuUserSnapshotsRepository;
  }
  async get(
    username: string,
    server: OsuServer
  ): Promise<CachedOsuUser | undefined> {
    const userSnapshot = await this.osuUserSnapshotsRepository.get({
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
      preferredMode: userSnapshot.preferredMode,
    };
  }
}
