import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../primitives/OsuServer';
import {OsuUserInfo} from './boundary/OsuUserInfo';
import {RecentScoreInfo} from './boundary/RecentScoreInfo';

export interface OsuApi {
  server: OsuServer;

  getUser(
    username: string,
    ruleset: OsuRuleset
  ): Promise<OsuUserInfo | undefined>;

  getRecentPlays(
    osuUserId: number,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset
  ): Promise<RecentScoreInfo[]>;
}
