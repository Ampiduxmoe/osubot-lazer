import {OsuApi} from '../../../../main/data/http/OsuApi';
import {OsuUserInfo} from '../../../../main/data/http/boundary/OsuUserInfo';
import {OsuUserRecentScoreInfo} from '../../../../main/data/http/boundary/OsuUserRecentScoreInfo';
import {OsuUserBestScoreInfo} from '../../../../main/data/http/boundary/OsuUserBestScoreInfo';
import {OsuRuleset} from '../../../../main/primitives/OsuRuleset';
import {OsuServer} from '../../../../main/primitives/OsuServer';
import {
  getFakeOsuUserId,
  getFakeOsuUserInfo,
  getFakeRecentScoreInfos,
  getFakeUserBestScoreInfos,
} from '../../Generators';
import {OsuBeatmapInfo} from '../../../../main/data/http/boundary/OsuBeatmapInfo';
import {OsuBeatmapUserScoreInfo} from '../../../../main/data/http/boundary/OsuBeatmapUserScoreInfo';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBeatmap(beatmapId: number): Promise<OsuBeatmapInfo | undefined> {
    throw new Error('Method not implemented.');
  }
  getBeatmapUserScores(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    beatmapId: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    osuUserId: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ruleset: OsuRuleset | undefined
  ): Promise<OsuBeatmapUserScoreInfo[] | undefined> {
    throw new Error('Method not implemented.');
  }
}
