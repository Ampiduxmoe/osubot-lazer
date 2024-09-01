import {
  BeatmapScore,
  SCORE_FULL_COMBO,
} from '../../../domain/entities/BeatmapScore';
import {Hitcounts} from '../../../domain/entities/hitcounts/Hitcounts';
import {HitcountsCtb} from '../../../domain/entities/hitcounts/HitcountsCtb';
import {HitcountsMania} from '../../../domain/entities/hitcounts/HitcountsMania';
import {HitcountsOsu} from '../../../domain/entities/hitcounts/HitcountsOsu';
import {HitcountsTaiko} from '../../../domain/entities/hitcounts/HitcountsTaiko';
import {Mode} from '../../../domain/entities/mode/Mode';
import {ModeCtb} from '../../../domain/entities/mode/ModeCtb';
import {ModeMania} from '../../../domain/entities/mode/ModeMania';
import {ModeOsu} from '../../../domain/entities/mode/ModeOsu';
import {ModeTaiko} from '../../../domain/entities/mode/ModeTaiko';
import {sum} from '../../../primitives/Arrays';
import {UserRecentScoreAdapter} from '../../adapters/user_recent_score/UserRecentScoreAdapter';
import {CachedOsuUsersDao} from '../../requirements/dao/CachedOsuUsersDao';
import {OsuUserRecentScoresDao} from '../../requirements/dao/OsuUserRecentScoresDao';
import {OsuUsersDao} from '../../requirements/dao/OsuUsersDao';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';
import {UseCase} from '../UseCase';
import {GetUserRecentPlaysRequest} from './GetUserRecentPlaysRequest';
import {
  GetUserRecentPlaysResponse,
  OsuUserRecentPlay,
} from './GetUserRecentPlaysResponse';

export class GetUserRecentPlaysUseCase
  implements UseCase<GetUserRecentPlaysRequest, GetUserRecentPlaysResponse>
{
  recentScoreAdapter: UserRecentScoreAdapter;
  constructor(
    protected recentScores: OsuUserRecentScoresDao,
    protected cachedOsuUsers: CachedOsuUsersDao,
    protected osuUsers: OsuUsersDao,
    scoreSimulations: ScoreSimulationsDao
  ) {
    this.recentScoreAdapter = new UserRecentScoreAdapter(scoreSimulations);
  }
  async execute(
    params: GetUserRecentPlaysRequest
  ): Promise<GetUserRecentPlaysResponse> {
    const {initiatorAppUserId, username, server, ruleset} = params;
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
        initiatorAppUserId,
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

    const rawRecentScores = await this.recentScores.get(
      initiatorAppUserId,
      targetOsuId,
      server,
      params.includeFails,
      params.modPatterns,
      params.quantity,
      params.startPosition,
      targetRuleset
    );
    const recentPlayPromises = rawRecentScores.map(score => {
      const beatmapScore = this.recentScoreAdapter.createBeatmapScore(
        score,
        targetRuleset
      );
      return getRecentPlayWithoutFcAndSsEstimations(
        beatmapScore,
        score.absolutePosition
      );
    });
    const recentPlays = await Promise.all(recentPlayPromises);
    if (recentPlays.length === 1) {
      const beatmapScore = this.recentScoreAdapter.createBeatmapScore(
        rawRecentScores[0],
        targetRuleset
      );
      const estimatedPpValues = getFcAndSsEstimations(beatmapScore);
      recentPlays[0].pp.ifFc = estimatedPpValues.fc;
      recentPlays[0].pp.ifSs = estimatedPpValues.ss;
    }
    return {
      isFailure: false,
      ruleset: targetRuleset,
      recentPlays: {
        username: targetCaseCorrectUsername,
        plays: recentPlays,
      },
    };
  }
}

function getFcAndSsEstimations(
  score: BeatmapScore<Mode, Hitcounts>
): FcAndSsEstimation {
  const modeClassName = score.baseBeatmap.mode.constructor.name;
  const hitcountsClassName = score.hitcounts.constructor.name;
  const unexpectedTypeCombinationError = Error(
    `Unexpected hitcounts type ${hitcountsClassName} for ${modeClassName}`
  );
  if (score.baseBeatmap.mode instanceof ModeOsu) {
    if (score.hitcounts instanceof HitcountsOsu) {
      return getOsuFcAndSsEstimations(
        score as BeatmapScore<ModeOsu, HitcountsOsu>
      );
    }
    throw unexpectedTypeCombinationError;
  }
  if (score.baseBeatmap.mode instanceof ModeTaiko) {
    if (score.hitcounts instanceof HitcountsTaiko) {
      return getTaikoFcAndSsEstimations(
        score as BeatmapScore<ModeTaiko, HitcountsTaiko>
      );
    }
    throw unexpectedTypeCombinationError;
  }
  if (score.baseBeatmap.mode instanceof ModeCtb) {
    if (score.hitcounts instanceof HitcountsCtb) {
      return getCtbFcAndSsEstimations(
        score as BeatmapScore<ModeCtb, HitcountsCtb>
      );
    }
    throw unexpectedTypeCombinationError;
  }
  if (score.baseBeatmap.mode instanceof ModeMania) {
    if (score.hitcounts instanceof HitcountsMania) {
      return getManiaFcAndSsEstimations(
        score as BeatmapScore<ModeMania, HitcountsMania>
      );
    }
    throw unexpectedTypeCombinationError;
  }
  throw Error(`Unexpected mode type ${modeClassName}`);
}

function getOsuFcAndSsEstimations(
  score: BeatmapScore<ModeOsu, HitcountsOsu>
): FcAndSsEstimation {
  const totalHits =
    score.hitcounts.great +
    score.hitcounts.ok +
    score.hitcounts.meh +
    score.hitcounts.miss;
  const fcScore = score.copy({
    passed: true,
    mapProgress: 1,
    maxCombo: SCORE_FULL_COMBO,
    hitcounts: new HitcountsOsu({
      great: Math.round(
        (score.hitcounts.great + score.hitcounts.miss) / score.mapProgress
      ),
      ok: Math.round(score.hitcounts.ok / score.mapProgress),
      meh: Math.round(score.hitcounts.meh / score.mapProgress),
      miss: 0,
    }),
  });
  const ssScore = fcScore.copy({
    hitcounts: new HitcountsOsu({
      great: totalHits,
      ok: 0,
      meh: 0,
      miss: 0,
    }),
  });
  return {
    fc: fcScore.getEstimatedPp(),
    ss: ssScore.getEstimatedPp(),
  };
}

function getTaikoFcAndSsEstimations(
  score: BeatmapScore<ModeTaiko, HitcountsTaiko>
): FcAndSsEstimation {
  const totalHits =
    score.hitcounts.great + score.hitcounts.ok + score.hitcounts.miss;
  const fcScore = score.copy({
    passed: true,
    mapProgress: 1,
    maxCombo: SCORE_FULL_COMBO,
    hitcounts: new HitcountsTaiko({
      great: Math.round(
        (score.hitcounts.great + score.hitcounts.miss) / score.mapProgress
      ),
      ok: Math.round(score.hitcounts.ok / score.mapProgress),
      miss: 0,
    }),
  });
  const ssScore = fcScore.copy({
    hitcounts: new HitcountsTaiko({
      great: totalHits,
      ok: 0,
      miss: 0,
    }),
  });
  return {
    fc: fcScore.getEstimatedPp(),
    ss: ssScore.getEstimatedPp(),
  };
}

function getCtbFcAndSsEstimations(
  score: BeatmapScore<ModeCtb, HitcountsCtb>
): FcAndSsEstimation {
  const fcScore = score.copy({
    passed: true,
    mapProgress: 1,
    maxCombo: SCORE_FULL_COMBO,
    hitcounts: new HitcountsCtb({
      miss: 0,
      smallTickMiss: Math.round(
        score.hitcounts.smallTickMiss / score.mapProgress
      ),
    }),
  });
  const ssScore = fcScore.copy({
    hitcounts: new HitcountsCtb({
      smallTickMiss: 0,
    }),
  });
  return {
    fc: fcScore.getEstimatedPp(),
    ss: ssScore.getEstimatedPp(),
  };
}

function getManiaFcAndSsEstimations(
  score: BeatmapScore<ModeMania, HitcountsMania>
): FcAndSsEstimation {
  const fcScore = score.copy({
    passed: true,
    mapProgress: 1,
    maxCombo: SCORE_FULL_COMBO,
    hitcounts: score.hitcounts.copy({
      miss: 0,
    }),
  });
  const totalHitcounts = sum(score.hitcounts.orderedValues);
  const ssScore = fcScore.copy({
    hitcounts: new HitcountsMania({
      perfect: totalHitcounts,
    }),
  });
  return {
    fc: fcScore.getEstimatedPp(),
    ss: ssScore.getEstimatedPp(),
  };
}

function getRecentPlayWithoutFcAndSsEstimations(
  score: BeatmapScore<Mode, Hitcounts>,
  absolutePosition: number
): OsuUserRecentPlay {
  const estimatedStarRating = score.hasStarRatingChangingMods
    ? score.getEstimatedStarRating()
    : score.baseBeatmap.starRating;
  const estimatedPpValue =
    score.pp === null ? score.getEstimatedPp() : score.pp;
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
      settings: m.settings,
    })),
    passed: score.passed,
    mapProgress: score.mapProgress,
    totalScore: score.totalScore,
    combo: score.maxCombo,
    accuracy: score.accuracy,
    pp: {
      value: score.pp ?? undefined,
      estimatedValue: estimatedPpValue,
      ifFc: undefined,
      ifSs: undefined,
    },
    orderedHitcounts: [...score.hitcounts.orderedValues],
    grade: score.rank,
  };
}

type FcAndSsEstimation = {
  fc: Promise<number | undefined> | number | undefined;
  ss: Promise<number | undefined> | number | undefined;
};
