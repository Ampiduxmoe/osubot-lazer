import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUserInfo} from './boundary/OsuUserInfo';
import {RecentScoreInfo} from './boundary/RecentScoreInfo';
import {UserBestScoreInfo} from './boundary/UserBestScoreInfo';

export interface OsuApi {
  readonly server: OsuServer;

  getUser(
    username: string,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserInfo | undefined>;

  getRecentPlays(
    osuUserId: number,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<RecentScoreInfo[]>;

  getUserBest(
    osuUserId: number,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<UserBestScoreInfo[]>;
}
