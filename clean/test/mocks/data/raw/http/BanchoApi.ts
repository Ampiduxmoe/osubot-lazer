import {OsuApi} from '../../../../../src/main/data/raw/http/OsuAPI';
import {OsuUserInfo} from '../../../../../src/main/data/raw/http/boundary/OsuUserInfo';
import {RecentScoreInfo} from '../../../../../src/main/data/raw/http/boundary/RecentScoreInfo';
import {UserBestScoreInfo} from '../../../../../src/main/data/raw/http/boundary/UserBestScoreInfo';
import {OsuRuleset} from '../../../../../src/primitives/OsuRuleset';
import {OsuServer} from '../../../../../src/primitives/OsuServer';
import {
  getFakeOsuUserId,
  getFakeOsuUserInfo,
  getFakeRecentScoreInfos,
  getFakeUserBestScoreInfos,
} from '../../../Generators';

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
  async getRecentPlays(
    osuUserId: number,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<RecentScoreInfo[]> {
    return getFakeRecentScoreInfos(osuUserId, ruleset)
      .filter(x => {
        if (includeFails) {
          return true;
        }
        return x.passed;
      })
      .slice(startPosition - 1, startPosition - 1 + quantity);
  }
  async getUserBest(
    osuUserId: number,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<UserBestScoreInfo[]> {
    return getFakeUserBestScoreInfos(osuUserId, ruleset).slice(
      startPosition - 1,
      startPosition - 1 + quantity
    );
  }
}
