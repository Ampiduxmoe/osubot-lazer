import {UserExtended, UserScore} from 'osu-web.js';
import {OsuServer} from '../../../../primitives/OsuServer';

export interface OsuApi {
  server: OsuServer;

  getUser(username: string): Promise<UserExtended | undefined>;

  getRecentPlays(
    osuId: number,
    includeFails: boolean,
    offset: number,
    quantity: number
  ): Promise<UserScore[]>;
}
