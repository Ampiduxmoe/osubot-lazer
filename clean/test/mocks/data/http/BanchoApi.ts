import {OsuApi} from '../../../../src/main/data/http/OsuAPI';
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
}
