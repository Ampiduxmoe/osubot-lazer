import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {
  OsuBeatmapUserScore,
  OsuBeatmapUserScoresDao,
} from '../../application/requirements/dao/OsuBeatmapUserScoresDao';
import {ModPatternCollection} from '../../primitives/ModPatternCollection';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {OsuApi} from '../http/OsuApi';
import {COMMON_REQUEST_SUBTARGETS} from './AppUserApiRequestsSummariesDaoImpl';
import {ModPatternCollectionMatcher} from './common/ModPatternCollectionMatcher';

export class OsuBeatmapUserScoresDaoImpl implements OsuBeatmapUserScoresDao {
  private apis: OsuApi[];
  private recentApiRequests: AppUserRecentApiRequestsDao;
  constructor(apis: OsuApi[], recentApiRequests: AppUserRecentApiRequestsDao) {
    this.apis = apis;
    this.recentApiRequests = recentApiRequests;
  }
  async get(
    appUserId: string,
    beatmapId: number,
    osuUserId: number,
    server: OsuServer,
    modPatterns: ModPatternCollection,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuBeatmapUserScore[] | undefined> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    const modMatcher = new ModPatternCollectionMatcher(modPatterns);
    if (modMatcher.earlyReturnValue === false) {
      return [];
    }
    await this.recentApiRequests.add({
      time: Date.now(),
      appUserId: appUserId,
      target: OsuServer[api.server],
      subtarget: COMMON_REQUEST_SUBTARGETS.beatmapUserScores,
      count: 1,
    });
    const scoreInfos = await api.getBeatmapUserScores(
      beatmapId,
      osuUserId,
      ruleset
    );
    if (scoreInfos === undefined) {
      return undefined;
    }
    const mapUserScores = scoreInfos.map(s => {
      const mapUserScore: OsuBeatmapUserScore = {
        id: s.id,
        userId: s.userId,
        mods: s.mods,
        maximumStatistics: s.maximumStatistics,
        statistics: s.statistics,
        rank: s.rank,
        accuracy: s.accuracy,
        endedAt: s.endedAt,
        maxCombo: s.maxCombo,
        passed: s.passed,
        pp: s.pp,
        totalScore: s.totalScore,
      };
      return mapUserScore;
    });
    const filteredScores = mapUserScores.filter(s =>
      modMatcher.match(s.mods.map(m => m.acronym))
    );
    return filteredScores;
  }
}
