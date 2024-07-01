import {OsuApi} from '../../../../src/main/data/http/OsuApi';
import {OsuUserInfo} from '../../../../src/main/data/http/boundary/OsuUserInfo';
import {OsuUserRecentScoreInfo} from '../../../../src/main/data/http/boundary/OsuUserRecentScoreInfo';
import {OsuUserBestScoreInfo} from '../../../../src/main/data/http/boundary/OsuUserBestScoreInfo';
import {OsuRuleset} from '../../../../src/primitives/OsuRuleset';
import {OsuServer} from '../../../../src/primitives/OsuServer';
import {
  getFakeOsuUserId,
  getFakeOsuUserInfo,
  getFakeRecentScoreInfos,
  getFakeUserBestScoreInfos,
} from '../../Generators';
import {OsuBeatmapInfo} from '../../../../src/main/data/http/boundary/OsuBeatmapInfo';
import {OsuBeatmapUserScoreInfo} from '../../../../src/main/data/http/boundary/OsuBeatmapUserScoreInfo';

export class FakeBanchoApi implements OsuApi {
  server = OsuServer.Bancho;
  async getUser(
    username: string,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserInfo | undefined> {
    const userId = getFakeOsuUserId(username);
    if (userId === undefined) {
      return undefined;
    }
    return getFakeOsuUserInfo(userId, ruleset);
  }
  async getUserRecentPlays(
    osuUserId: number,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserRecentScoreInfo[]> {
    return getFakeRecentScoreInfos(osuUserId, ruleset)
      .filter(x => {
        if (includeFails) {
          return true;
        }
        return x.passed;
      })
      .slice(startPosition - 1, startPosition - 1 + quantity);
  }
  async getUserBestPlays(
    osuUserId: number,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserBestScoreInfo[]> {
    return getFakeUserBestScoreInfos(osuUserId, ruleset).slice(
      startPosition - 1,
      startPosition - 1 + quantity
    );
  }
  getBeatmap(beatmapId: number): Promise<OsuBeatmapInfo | undefined> {
    throw new Error('Method not implemented.');
  }
  getBeatmapUserScores(
    beatmapId: number,
    osuUserId: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuBeatmapUserScoreInfo[] | undefined> {
    throw new Error('Method not implemented.');
  }
}
