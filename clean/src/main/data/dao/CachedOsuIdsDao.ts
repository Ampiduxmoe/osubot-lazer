import {OsuServer} from '../../../primitives/OsuServer';
import {OsuIdAndUsername} from '../raw/db/entities/OsuIdAndUsername';

export type CachedOsuId = OsuIdAndUsername;

export interface CachedOsuIdsDao {
  get(username: string, server: OsuServer): Promise<CachedOsuId | undefined>;
}
