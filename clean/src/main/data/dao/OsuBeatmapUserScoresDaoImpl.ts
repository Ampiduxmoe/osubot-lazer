import {OsuServer} from '../../../primitives/OsuServer';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {
  OsuBeatmapUserScore,
  OsuBeatmapUserScoresDao,
} from '../../application/requirements/dao/OsuBeatmapUserScoresDao';
import {OsuApi} from '../http/OsuApi';
import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {COMMON_REQUEST_SUBTARGETS} from './AppUserApiRequestsSummariesDaoImpl';
import {ModAcronym} from '../../../primitives/ModAcronym';

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
    mods: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[],
    ruleset: OsuRuleset | undefined
  ): Promise<OsuBeatmapUserScore[] | undefined> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    const requiredMods = mods
      .filter(m => m.isOptional === false)
      .map(m => m.acronym);
    const optionalMods = mods
      .filter(m => m.isOptional === true)
      .map(m => m.acronym)
      .filter(m => !m.is('nm'));
    const allFilterMods = [...requiredMods, ...optionalMods];
    if (
      ModAcronym.listContains('nm', requiredMods) &&
      requiredMods.length > 1
    ) {
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
    const filteredScores = mapUserScores.filter(s => {
      if (allFilterMods.length === 0) {
        return true;
      }
      const scoreMods = s.mods.map(m => m.acronym);
      if (
        ModAcronym.listContains('nm', requiredMods) &&
        scoreMods.length === 0
      ) {
        return true;
      }
      for (const scoreMod of scoreMods) {
        if (!scoreMod.isAnyOf(...allFilterMods)) {
          return false;
        }
      }
      for (const requiredMod of requiredMods) {
        if (!requiredMod.isAnyOf(...scoreMods)) {
          return false;
        }
      }
      return true;
    });
    return filteredScores;
  }
}
