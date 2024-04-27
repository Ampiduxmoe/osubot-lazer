import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../primitives/OsuServer';
import {OsuUserInfo} from './boundary/OsuUserInfo';

export interface OsuApi {
  server: OsuServer;

  getUser(
    username: string,
    ruleset: OsuRuleset
  ): Promise<OsuUserInfo | undefined>;

  getRecentPlays(
    osuId: number,
    includeFails: boolean,
    offset: number,
    quantity: number
  ): Promise<unknown[]>;
}
