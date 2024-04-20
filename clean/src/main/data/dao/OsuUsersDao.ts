import {UserExtended} from 'osu-web.js';
import {OsuServer} from '../../../primitives/OsuServer';

export type OsuUser = UserExtended;

export interface OsuUsersDao {
  getByUsername(
    username: string,
    server: OsuServer
  ): Promise<OsuUser | undefined>;
}
