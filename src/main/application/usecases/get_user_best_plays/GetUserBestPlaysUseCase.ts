import {UseCase} from '../UseCase';
import {CachedOsuUsersDao} from '../../requirements/dao/CachedOsuUsersDao';
import {OsuUsersDao} from '../../requirements/dao/OsuUsersDao';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';
import {BestPlay, GetUserBestPlaysResponse} from './GetUserBestPlaysResponse';
import {GetUserBestPlaysRequest} from './GetUserBestPlaysRequest';
import {OsuUserBestScoresDao} from '../../requirements/dao/OsuUserBestScoresDao';
import {BeatmapScore} from '../../../domain/entities/BeatmapScore';
import {Mode} from '../../../domain/entities/mode/Mode';
import {Hitcounts} from '../../../domain/entities/hitcounts/Hitcounts';
import {UserBestScoreAdapter} from '../../adapters/user_best_score/UserBestScoreAdapter';

export class GetUserBestPlaysUseCase
  implements UseCase<GetUserBestPlaysRequest, GetUserBestPlaysResponse>
{
  userBestPlays: OsuUserBestScoresDao;
  cachedOsuUsers: CachedOsuUsersDao;
  osuUsers: OsuUsersDao;
  userBestScoreAdapter: UserBestScoreAdapter;
  constructor(
    userBestPlays: OsuUserBestScoresDao,
    scoreSimulations: ScoreSimulationsDao,
    cachedOsuUsers: CachedOsuUsersDao,
    osuUsers: OsuUsersDao
  ) {
    this.userBestPlays = userBestPlays;
    this.cachedOsuUsers = cachedOsuUsers;
    this.osuUsers = osuUsers;
    this.userBestScoreAdapter = new UserBestScoreAdapter(scoreSimulations);
  }
  async execute(
    params: GetUserBestPlaysRequest
  ): Promise<GetUserBestPlaysResponse> {
    const {appUserId, username, server, ruleset} = params;
    const userSnapshot = await this.cachedOsuUsers.get(username, server);
    let targetOsuId = userSnapshot?.id;
    let targetCaseCorrectUsername = userSnapshot?.username;
    let targetRuleset = ruleset ?? userSnapshot?.preferredMode;
    if (
      targetOsuId === undefined ||
      targetCaseCorrectUsername === undefined ||
      targetRuleset === undefined
    ) {
      const osuUser = await this.osuUsers.getByUsername(
        appUserId,
        username,
        server,
        undefined
      );
      if (osuUser === undefined) {
        return {
          isFailure: true,
          failureReason: 'user not found',
        };
      }
      targetOsuId = osuUser.id;
      targetCaseCorrectUsername = osuUser.username;
      targetRuleset ??= osuUser.preferredMode;
    }

    const rawBestScores = await this.userBestPlays.get(
      appUserId,
      targetOsuId,
      server,
      params.mods,
      params.quantity,
      params.startPosition,
      targetRuleset
    );
    const bestPlayPromises = rawBestScores.map(score => {
      const beatmapScore = this.userBestScoreAdapter.createBeatmapScore(
        score,
        targetRuleset
      );
      return getBestPlay(beatmapScore, score.absolutePosition);
    });
    const bestPlays = await Promise.all(bestPlayPromises);
    return {
      isFailure: false,
      ruleset: targetRuleset,
      bestPlays: {
        username: targetCaseCorrectUsername,
        plays: bestPlays,
      },
    };
  }
}

async function getBestPlay(
  score: BeatmapScore<Mode, Hitcounts>,
  absolutePosition: number
): Promise<BestPlay> {
  const estimatedStarRating = score.hasStarRatingChangingMods
    ? await score.getEstimatedStarRating()
    : score.baseBeatmap.starRating;
  return {
    absolutePosition: absolutePosition,
    beatmapset: {
      id: score.baseBeatmap.beatmapset.id,
      status: score.baseBeatmap.beatmapset.status,
      artist: score.baseBeatmap.song.artist,
      title: score.baseBeatmap.song.title,
      creator: score.baseBeatmap.beatmapset.creatorUsername,
      coverUrl: `https://assets.ppy.sh/beatmaps/${score.baseBeatmap.beatmapset.id}/covers/raw.jpg`,
    },
    beatmap: {
      id: score.baseBeatmap.id,
      difficultyName: score.baseBeatmap.difficultyName,
      totalLength: score.moddedBeatmap.song.length,
      drainLength: score.moddedBeatmap.length,
      bpm: score.moddedBeatmap.song.bpm,
      estimatedStarRating: estimatedStarRating,
      ar: score.moddedBeatmap.stats.ar,
      cs: score.moddedBeatmap.stats.cs,
      od: score.moddedBeatmap.stats.od,
      hp: score.moddedBeatmap.stats.hp,
      maxCombo: score.baseBeatmap.maxCombo,
      url: `https://osu.ppy.sh/b/${score.baseBeatmap.id}`,
    },
    mods: score.mods.map(m => ({
      acronym: m.acronym,
    })),
    passed: score.passed,
    totalScore: score.totalScore,
    combo: score.maxCombo,
    accuracy: score.accuracy,
    pp:
      score.pp ??
      (() => {
        throw Error('PP can not be null on user best play');
      })(),
    orderedHitcounts: [...score.hitcounts.orderedValues],
    grade: score.rank,
    date: score.endedAt.getTime(),
  };
}
