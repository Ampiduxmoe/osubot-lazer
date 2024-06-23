import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUserInfo} from './boundary/OsuUserInfo';
import {OsuUserRecentScoreInfo} from './boundary/OsuUserRecentScoreInfo';
import {OsuUserBestScoreInfo} from './boundary/OsuUserBestScoreInfo';
import {OsuBeatmapInfo} from './boundary/OsuBeatmapInfo';

export interface OsuApi {
  readonly server: OsuServer;

  getUser(
    username: string,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserInfo | undefined>;

  getUserRecentPlays(
    osuUserId: number,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserRecentScoreInfo[]>;

  getUserBestPlays(
    osuUserId: number,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserBestScoreInfo[]>;

  getBeatmap(beatmapId: number): Promise<OsuBeatmapInfo | undefined>;
}
