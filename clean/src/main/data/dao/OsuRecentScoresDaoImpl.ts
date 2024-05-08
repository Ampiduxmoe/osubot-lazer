import {OsuServer} from '../../../primitives/OsuServer';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {
  OsuIdAndUsername,
  OsuIdAndUsernameKey,
} from '../raw/db/entities/OsuIdAndUsername';
import {OsuRecentScoresDao, RecentScore} from './OsuRecentScoresDao';
import {OsuApi} from '../raw/http/OsuAPI';
import {SqlDbTable} from '../raw/db/SqlDbTable';
import {
  AppUserRecentApiRequestsDao,
  COMMON_REQUEST_SUBTARGETS,
} from './AppUserRecentApiRequestsDao';

export class OsuRecentScoresDaoImpl implements OsuRecentScoresDao {
  private apis: OsuApi[];
  private osuIdsAndUsernamesTable: SqlDbTable<
    OsuIdAndUsername,
    OsuIdAndUsernameKey
  >;
  private recentApiRequests: AppUserRecentApiRequestsDao;
  constructor(
    apis: OsuApi[],
    osuIdsAndUsernamesTable: SqlDbTable<OsuIdAndUsername, OsuIdAndUsernameKey>,
    recentApiRequests: AppUserRecentApiRequestsDao
  ) {
    this.apis = apis;
    this.osuIdsAndUsernamesTable = osuIdsAndUsernamesTable;
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
    ruleset: OsuRuleset
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
      const userIdAndUsername = {
        id: scoreInfo.user.id,
        username: scoreInfo.user.username,
      };
      await this.cacheUserId(userIdAndUsername, server);
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

  private async cacheUserId(
    osuUserInfo: OsuUserIdAndUsername,
    server: OsuServer
  ): Promise<void> {
    const newOsuIdAndUsername: OsuIdAndUsername = {
      username: osuUserInfo.username,
      server: server,
      id: osuUserInfo.id,
    };
    const existingIdAndUsername = await this.osuIdsAndUsernamesTable.get(
      newOsuIdAndUsername as OsuIdAndUsernameKey
    );
    if (existingIdAndUsername === undefined) {
      await this.osuIdsAndUsernamesTable.add(newOsuIdAndUsername);
    } else {
      await this.osuIdsAndUsernamesTable.update(newOsuIdAndUsername);
    }
  }
}

type OsuUserIdAndUsername = {
  id: number;
  username: string;
};
