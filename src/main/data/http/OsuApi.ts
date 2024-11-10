import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {OsuBeatmapInfo} from './boundary/OsuBeatmapInfo';
import {OsuBeatmapUserScoreInfo} from './boundary/OsuBeatmapUserScoreInfo';
import {OsuBeatmapsetInfo} from './boundary/OsuBeatmapsetInfo';
import {OsuUserBestScoreInfo} from './boundary/OsuUserBestScoreInfo';
import {OsuUserInfo} from './boundary/OsuUserInfo';
import {OsuUserRecentScoreInfo} from './boundary/OsuUserRecentScoreInfo';

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

  getBeatmapUserScores(
    beatmapId: number,
    osuUserId: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuBeatmapUserScoreInfo[] | undefined>;

  getBeatmapset(beatmapsetId: number): Promise<OsuBeatmapsetInfo | undefined>;
}
