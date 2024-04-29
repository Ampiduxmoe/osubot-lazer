import {UseCase} from '../UseCase';
import {GetRecentPlaysRequest} from './GetRecentPlaysRequest';
import {
  GetRecentPlaysResponse,
  RecentPlay,
  BeatmapsetRankStatus,
} from './GetRecentPlaysResponse';
import {
  OsuRecentScoresDao,
  RecentScore,
} from '../../../data/dao/OsuRecentScoresDao';
import {CachedOsuIdsDao} from '../../../data/dao/CachedOsuIdsDao';
import {OsuUsersDao} from '../../../data/dao/OsuUsersDao';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export class GetRecentPlaysUseCase
  implements UseCase<GetRecentPlaysRequest, GetRecentPlaysResponse>
{
  recentScores: OsuRecentScoresDao;
  cachedOsuIds: CachedOsuIdsDao;
  osuUsers: OsuUsersDao;
  constructor(
    recentScores: OsuRecentScoresDao,
    cachedOsuIds: CachedOsuIdsDao,
    osuUsers: OsuUsersDao
  ) {
    this.recentScores = recentScores;
    this.cachedOsuIds = cachedOsuIds;
    this.osuUsers = osuUsers;
  }
  async execute(
    params: GetRecentPlaysRequest
  ): Promise<GetRecentPlaysResponse> {
    const username = params.username;
    const server = params.server;
    const osuIdAndUsername = await this.cachedOsuIds.get(username, server);
    let osuId = osuIdAndUsername?.id;
    let caseCorrectUsername = osuIdAndUsername?.username;
    if (osuId === undefined || caseCorrectUsername === undefined) {
      const osuUser = await this.osuUsers.getByUsername(
        username,
        server,
        OsuRuleset.osu
      );
      if (osuUser === undefined) {
        return {
          isFailure: true,
          failureReason: 'user not found',
        };
      }
      osuId = osuUser.id;
      caseCorrectUsername = osuUser.username;
    }
    osuId = osuId!;
    caseCorrectUsername = caseCorrectUsername!;
    const rawRecentScores = await this.recentScores.get(
      osuId,
      server,
      params.includeFails,
      params.quantity,
      params.startPosition,
      OsuRuleset.osu
    );
    const recentPlays = rawRecentScores.map(s => {
      const osuUserRecentScore: RecentPlay = {
        beatmapset: {
          status: extractBeatmapsetRankStatus(s),
          artist: s.beatmapset.artist,
          title: s.beatmapset.title,
          creator: s.beatmapset.creator,
        },
        beatmap: {
          difficultyName: s.beatmap.version,
          totalLength: s.beatmap.totalLength,
          drainLength: s.beatmap.hitLength,
          bpm: s.beatmap.bpm,
          stars: s.beatmap.difficultyRating,
          ar: s.beatmap.ar,
          cs: s.beatmap.cs,
          od: s.beatmap.od,
          hp: s.beatmap.hp,
          maxCombo: NaN,
          url: s.beatmap.url,
          countCircles: s.beatmap.countCircles,
          countSliders: s.beatmap.countSliders,
          countSpinners: s.beatmap.countSpinners,
        },
        mods: s.mods,
        passed: s.passed,
        totalScore: s.totalScore,
        combo: s.maxCombo,
        accuracy: s.accuracy,
        pp: {
          value: s.pp || NaN,
          ifFc: NaN,
          ifSs: NaN,
        },
        countGreat: s.statistics.great,
        countOk: s.statistics.ok,
        countMeh: s.statistics.meh,
        countMiss: s.statistics.miss,
        grade: s.rank,
      };
      return osuUserRecentScore;
    });
    return {
      isFailure: false,
      recentPlays: {
        username: caseCorrectUsername,
        plays: recentPlays,
      },
    };
  }
}

function extractBeatmapsetRankStatus(score: RecentScore): BeatmapsetRankStatus {
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
    default:
      throw Error('Unkown beatmapset status');
  }
}
