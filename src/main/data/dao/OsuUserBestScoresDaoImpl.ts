import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {
  OsuUserBestScore,
  OsuUserBestScoreFilter,
  OsuUserBestScoresDao,
} from '../../application/requirements/dao/OsuUserBestScoresDao';
import {OsuPlayGrade} from '../../primitives/OsuPlayGrade';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {OsuUserBestScoreInfo} from '../http/boundary/OsuUserBestScoreInfo';
import {OsuApi} from '../http/OsuApi';
import {OsuUserSnapshotsRepository} from '../repository/repositories/OsuUserSnapshotsRepository';
import {COMMON_REQUEST_SUBTARGETS} from './AppUserApiRequestsSummariesDaoImpl';
import {ModPatternCollectionMatcher} from './common/ModPatternCollectionMatcher';

export class OsuUserBestScoresDaoImpl implements OsuUserBestScoresDao {
  constructor(
    protected apis: OsuApi[],
    protected osuUserSnapshotsRepository: OsuUserSnapshotsRepository,
    protected recentApiRequests: AppUserRecentApiRequestsDao
  ) {}
  async get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined,
    filter: OsuUserBestScoreFilter
  ): Promise<OsuUserBestScore[]> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    const modMatcher = new ModPatternCollectionMatcher(filter.modPatterns);
    if (modMatcher.earlyReturnValue === false) {
      return [];
    }
    let adjustedQuantity = quantity;
    let adjustedStartPosition = startPosition;
    const hasFilters =
      modMatcher.earlyReturnValue !== true &&
      [
        filter.minGrade,
        filter.maxGrade,
        filter.minAcc,
        filter.maxAcc,
        filter.minPp,
        filter.maxPp,
      ].find(x => x !== undefined) !== undefined;
    if (hasFilters) {
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
    const scoreInfos = await api.getUserBestPlays(
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
      const bestScore: OsuUserBestScore = {
        id: s.id,
        absolutePosition: adjustedStartPosition + i,
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
        beatmap: {
          id: s.beatmap.id,
          userId: s.beatmap.userId,
          version: s.beatmap.version,
          totalLength: s.beatmap.totalLength,
          hitLength: s.beatmap.hitLength,
          difficultyRating: s.beatmap.difficultyRating,
          bpm: s.beatmap.bpm,
          ar: s.beatmap.ar,
          cs: s.beatmap.cs,
          od: s.beatmap.od,
          hp: s.beatmap.hp,
          countCircles: s.beatmap.countCircles,
          countSliders: s.beatmap.countSliders,
          countSpinners: s.beatmap.countSpinners,
          url: s.beatmap.url,
        },
        beatmapset: {
          id: s.beatmapset.id,
          userId: s.beatmapset.userId,
          creator: s.beatmapset.creator,
          artist: s.beatmapset.artist,
          title: s.beatmapset.title,
          coverUrl: s.beatmapset.coverUrl,
          status: capitalizeBeatmapsetStatus(s),
        },
        user: {
          id: s.user.id,
          username: s.user.username,
        },
      };
      return bestScore;
    });
    let filteredScores = bestScores.filter(s => {
      if (!modMatcher.match(s.mods.map(m => m.acronym))) {
        return false;
      }
      const scoreGrade = normilizeScoreGrade(s.rank);
      if (filter.minGrade !== undefined && scoreGrade < filter.minGrade) {
        return false;
      }
      if (filter.maxGrade !== undefined && scoreGrade > filter.maxGrade) {
        return false;
      }
      if (filter.minAcc !== undefined && s.accuracy < filter.minAcc) {
        return false;
      }
      if (filter.maxAcc !== undefined && s.accuracy > filter.maxAcc) {
        return false;
      }
      if (filter.minPp !== undefined && s.accuracy < filter.minPp) {
        return false;
      }
      if (filter.maxPp !== undefined && s.accuracy > filter.maxPp) {
        return false;
      }
      return true;
    });
    if (hasFilters) {
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
    const existingIdAndUsername = await this.osuUserSnapshotsRepository.get({
      username: username,
      server: server,
    });
    if (existingIdAndUsername !== undefined) {
      existingIdAndUsername.id = id;
      await this.osuUserSnapshotsRepository.update(existingIdAndUsername);
    }
  }
}

function capitalizeBeatmapsetStatus(
  score: OsuUserBestScoreInfo
): CapitalizedBeatmapsetStatus {
  switch (score.beatmapset.status) {
    case 'graveyard':
      return 'Graveyard';
    case 'wip':
      return 'Wip';
    case 'pending':
      return 'Pending';
    case 'ranked':
      return 'Ranked';
    case 'approved':
      return 'Approved';
    case 'qualified':
      return 'Qualified';
    case 'loved':
      return 'Loved';
  }
}

type CapitalizedBeatmapsetStatus =
  | 'Graveyard'
  | 'Wip'
  | 'Pending'
  | 'Ranked'
  | 'Approved'
  | 'Qualified'
  | 'Loved';

function normilizeScoreGrade(grade: InternalScoreGrade): OsuPlayGrade {
  switch (grade) {
    case 'XH':
      return OsuPlayGrade.SS;
    case 'X':
      return OsuPlayGrade.SS;
    case 'SH':
      return OsuPlayGrade.S;
    case 'S':
      return OsuPlayGrade.S;
    case 'A':
      return OsuPlayGrade.A;
    case 'B':
      return OsuPlayGrade.B;
    case 'C':
      return OsuPlayGrade.C;
    case 'D':
      return OsuPlayGrade.D;
    case 'F':
      return OsuPlayGrade.F;
  }
}

type InternalScoreGrade = 'XH' | 'X' | 'SH' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
