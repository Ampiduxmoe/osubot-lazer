import {OsuServer} from '../../primitives/OsuServer';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {
  OsuBeatmapUserScore,
  OsuBeatmapUserScoresDao,
} from '../../application/requirements/dao/OsuBeatmapUserScoresDao';
import {OsuApi} from '../http/OsuApi';
import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {COMMON_REQUEST_SUBTARGETS} from './AppUserApiRequestsSummariesDaoImpl';
import {ModCombinationMatcher} from './common/ModCombinationMatcher';
import {ModCombinationPattern} from '../../primitives/ModCombinationPattern';

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
    modPatterns: ModCombinationPattern[],
    ruleset: OsuRuleset | undefined
  ): Promise<OsuBeatmapUserScore[] | undefined> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    const modMatchers = modPatterns.map(p => new ModCombinationMatcher(p));
    if (
      modMatchers.length > 0 &&
      modMatchers.filter(m => m.earlyReturnValue === false).length ===
        modMatchers.length
    ) {
      // all matchers have impossible patterns
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
      modMatchers.length === 0
        ? true
        : modMatchers.find(matcher =>
            matcher.match(s.mods.map(m => m.acronym))
          ) !== undefined
    );
    return filteredScores;
  }
}
