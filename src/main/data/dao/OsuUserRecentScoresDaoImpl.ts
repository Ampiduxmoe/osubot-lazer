import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {
  OsuUserRecentScore,
  OsuUserRecentScoresDao,
} from '../../application/requirements/dao/OsuUserRecentScoresDao';
import {ModCombinationPattern} from '../../primitives/ModCombinationPattern';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {OsuUserRecentScoreInfo} from '../http/boundary/OsuUserRecentScoreInfo';
import {OsuApi} from '../http/OsuApi';
import {OsuUserSnapshotsRepository} from '../repository/repositories/OsuUserSnapshotsRepository';
import {COMMON_REQUEST_SUBTARGETS} from './AppUserApiRequestsSummariesDaoImpl';
import {ModCombinationMatcher} from './common/ModCombinationMatcher';

export class OsuUserRecentScoresDaoImpl implements OsuUserRecentScoresDao {
  private apis: OsuApi[];
  private osuUserSnapshotsRepository: OsuUserSnapshotsRepository;
  private recentApiRequests: AppUserRecentApiRequestsDao;
  constructor(
    apis: OsuApi[],
    osuUserSnapshotsRepository: OsuUserSnapshotsRepository,
    recentApiRequests: AppUserRecentApiRequestsDao
  ) {
    this.apis = apis;
    this.osuUserSnapshotsRepository = osuUserSnapshotsRepository;
    this.recentApiRequests = recentApiRequests;
  }
  async get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    includeFails: boolean,
    modPatterns: ModCombinationPattern[],
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserRecentScore[]> {
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
    let adjustedQuantity = quantity;
    let adjustedStartPosition = startPosition;
    const hasModFilters =
      modMatchers.find(
        matcher =>
          matcher.normalizedPattern.map(group => group.mods).flat().length > 0
      ) !== undefined;
    if (hasModFilters) {
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
    const scoreInfos = await api.getUserRecentPlays(
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
      const recentScore: OsuUserRecentScore = {
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
      return recentScore;
    });
    let filteredScores = recentScores.filter(s =>
      modMatchers.length === 0
        ? true
        : modMatchers.find(matcher =>
            matcher.match(s.mods.map(m => m.acronym))
          ) !== undefined
    );
    if (hasModFilters) {
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
  score: OsuUserRecentScoreInfo
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
