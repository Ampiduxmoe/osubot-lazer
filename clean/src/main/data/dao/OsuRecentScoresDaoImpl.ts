import {OsuServer} from '../../../primitives/OsuServer';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuRecentScoresDao, RecentScore} from './OsuRecentScoresDao';
import {OsuApi} from '../raw/http/OsuAPI';
import {
  AppUserRecentApiRequestsDao,
  COMMON_REQUEST_SUBTARGETS,
} from './AppUserRecentApiRequestsDao';
import {OsuUserSnapshots} from '../raw/db/tables/OsuUserSnapshots';

export class OsuRecentScoresDaoImpl implements OsuRecentScoresDao {
  private apis: OsuApi[];
  private osuUserSnapshotsTable: OsuUserSnapshots;
  private recentApiRequests: AppUserRecentApiRequestsDao;
  constructor(
    apis: OsuApi[],
    osuUserSnapshotsTable: OsuUserSnapshots,
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
    includeFails: boolean,
    mods: {
      acronym: string;
      isOptional: boolean;
    }[],
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<RecentScore[]> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    const requiredMods = mods
      .filter(m => m.isOptional === false)
      .map(m => m.acronym.toLowerCase());
    const optionalMods = mods
      .filter(m => m.isOptional === true)
      .map(m => m.acronym.toLowerCase())
      .filter(m => m !== 'nm');
    const allFilterMods = [...requiredMods, ...optionalMods];
    if (requiredMods.includes('nm') && requiredMods.length > 1) {
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
      subtarget: COMMON_REQUEST_SUBTARGETS.userRecentPlays,
      count: 1,
    });
    const scoreInfos = await api.getRecentPlays(
      osuUserId,
      includeFails,
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
    const recentScores = scoreInfos.map((s, i) => {
      const recentScore = s as RecentScore;
      recentScore.absolutePosision = i + adjustedStartPosition;
      return recentScore;
    });
    let filteredScores = recentScores.filter(s => {
      if (allFilterMods.length === 0) {
        return true;
      }
      const scoreMods = s.mods.map(m => m.acronym.toLowerCase());
      if (requiredMods.includes('nm') && scoreMods.length === 0) {
        return true;
      }
      for (const scoreMod of scoreMods) {
        if (!allFilterMods.includes(scoreMod)) {
          return false;
        }
      }
      for (const requiredMod of requiredMods) {
        if (!scoreMods.includes(requiredMod)) {
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
