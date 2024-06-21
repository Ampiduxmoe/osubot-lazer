import {OsuServer} from '../../../primitives/OsuServer';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuApi} from '../http/OsuAPI';
import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {
  OsuUserBestScoresDao,
  UserBestScore,
} from '../../application/requirements/dao/OsuUserBestScoresDao';
import {COMMON_REQUEST_SUBTARGETS} from './AppUserApiRequestsSummariesDaoImpl';
import {OsuUserSnapshotsRepository} from '../repository/repositories/OsuUserSnapshotsRepository';
import {ModAcronym} from '../../../primitives/ModAcronym';

export class OsuUserBestScoresDaoImpl implements OsuUserBestScoresDao {
  private apis: OsuApi[];
  private osuUserSnapshotsTable: OsuUserSnapshotsRepository;
  private recentApiRequests: AppUserRecentApiRequestsDao;
  constructor(
    apis: OsuApi[],
    osuUserSnapshotsTable: OsuUserSnapshotsRepository,
    recentApiRequests: AppUserRecentApiRequestsDao
  ) {
    this.apis = apis;
    this.osuUserSnapshotsTable = osuUserSnapshotsTable;
    this.recentApiRequests = recentApiRequests;
  }
  async get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    mods: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[],
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<UserBestScore[]> {
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
    let adjustedQuantity = quantity;
    let adjustedStartPosition = startPosition;
    if (allFilterMods.length > 0) {
      adjustedQuantity = 100;
      adjustedStartPosition = 1;
    }
    await this.recentApiRequests.add({
      time: Date.now(),
      appUserId: appUserId,
      target: OsuServer[api.server],
      subtarget: COMMON_REQUEST_SUBTARGETS.userBestPlays,
      count: 1,
    });
    const scoreInfos = await api.getUserBest(
      osuUserId,
      adjustedQuantity,
      adjustedStartPosition,
      ruleset
    );
    if (scoreInfos.length > 0) {
      const scoreInfo = scoreInfos[0];
      await this.cacheOsuUser(
        scoreInfo.user.username,
        server,
        scoreInfo.user.id
      );
    }
    const bestScores = scoreInfos.map((s, i) => {
      const bestScore = s as UserBestScore;
      bestScore.absolutePosition = i + adjustedStartPosition;
      return bestScore;
    });
    let filteredScores = bestScores.filter(s => {
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
    if (allFilterMods.length > 0) {
      filteredScores = filteredScores.splice(startPosition - 1);
      filteredScores.splice(quantity);
    }
    return filteredScores;
  }

  private async cacheOsuUser(
    username: string,
    server: OsuServer,
    id: number
  ): Promise<void> {
    const existingIdAndUsername = await this.osuUserSnapshotsTable.get({
      username: username,
      server: server,
    });
    if (existingIdAndUsername !== undefined) {
      existingIdAndUsername.id = id;
      await this.osuUserSnapshotsTable.update(existingIdAndUsername);
    }
  }
}
