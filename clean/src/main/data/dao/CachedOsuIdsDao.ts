import {OsuServer} from '../../../primitives/OsuServer';
import {OsuIdAndUsername} from '../raw/db/entities/OsuIdAndUsername';

export interface CachedOsuIdsDao {
  get(
    username: string,
    server: OsuServer
  ): Promise<OsuIdAndUsername | undefined>;
}
