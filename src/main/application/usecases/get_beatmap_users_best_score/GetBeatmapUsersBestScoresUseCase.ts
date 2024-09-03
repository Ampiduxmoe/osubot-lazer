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
import {sum, sumBy} from '../../../primitives/Arrays';
import {BeatmapUserScoreAdapter} from '../../adapters/beatmap_user_score/BeatmapUserScoreAdapter';
import {CachedOsuUsersDao} from '../../requirements/dao/CachedOsuUsersDao';
import {OsuBeatmapUserScoresDao} from '../../requirements/dao/OsuBeatmapUserScoresDao';
import {OsuBeatmapsDao} from '../../requirements/dao/OsuBeatmapsDao';
import {OsuUsersDao} from '../../requirements/dao/OsuUsersDao';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';
import {UseCase} from '../UseCase';
import {GetBeatmapUsersBestScoresRequest} from './GetBeatmapUsersBestScoresRequest';
import {
  GetBeatmapUsersBestScoresResponse,
  OsuMap,
  OsuMapUserBestPlays,
  OsuMapUserPlay,
} from './GetBeatmapUsersBestScoresResponse';

export class GetBeatmapUsersBestScoresUseCase
  implements
    UseCase<
      GetBeatmapUsersBestScoresRequest,
      GetBeatmapUsersBestScoresResponse
    >
{
  beatmapUserScoresAdapter: BeatmapUserScoreAdapter;
  constructor(
    protected beatmaps: OsuBeatmapsDao,
    protected mapUserScores: OsuBeatmapUserScoresDao,
    protected cachedOsuUsers: CachedOsuUsersDao,
    protected osuUsers: OsuUsersDao,
    scoreSimulations: ScoreSimulationsDao
  ) {
    this.beatmapUserScoresAdapter = new BeatmapUserScoreAdapter(
      scoreSimulations
    );
  }
  async execute(
    params: GetBeatmapUsersBestScoresRequest
  ): Promise<GetBeatmapUsersBestScoresResponse> {
    const {
      initiatorAppUserId,
      server,
      beatmapId,
      usernames,
      startPosition,
      quantityPerUser,
      modPatterns,
    } = params;
    const beatmap = await this.beatmaps.get(
      initiatorAppUserId,
      beatmapId,
      server
    );
    if (beatmap === undefined) {
      return {
        isFailure: true,
        failureReason: 'beatmap not found',
      };
    }

    const targets: {osuId: number; caseCorrectUsername: string}[] = [];
    const missingUsernames: string[] = [];
    for (const username of usernames) {
      const userSnapshot = await this.cachedOsuUsers.get(username, server);
      if (userSnapshot !== undefined) {
        targets.push({
          osuId: userSnapshot.id,
          caseCorrectUsername: userSnapshot.username,
        });
        continue;
      }
      const osuUser = await this.osuUsers.getByUsername(
        initiatorAppUserId,
        username,
        server,
        undefined
      );
      if (osuUser === undefined) {
        missingUsernames.push(username);
        continue;
      }
      targets.push({
        osuId: osuUser.id,
        caseCorrectUsername: osuUser.username,
      });
    }

    const usernameScoresPromises = targets.map(async t => ({
      username: t.caseCorrectUsername,
      rawScores: await this.mapUserScores.get(
        initiatorAppUserId,
        beatmapId,
        t.osuId,
        server,
        modPatterns,
        undefined
      ),
    }));
    const usernamesScores = await Promise.all(usernameScoresPromises);
    const scoreCount = sumBy(
      x =>
        Math.min(
          Math.max((x.rawScores?.length ?? 0) - startPosition + 1, 0),
          quantityPerUser
        ),
      usernamesScores
    );
    const estimatePpForAllScores = true;
    const bestScoresOutput: OsuMapUserBestPlays[] = [];
    for (const usernameToScores of usernamesScores) {
      const username = usernameToScores.username;
      const rawMapUserScores = usernameToScores.rawScores;
      if (rawMapUserScores === undefined) {
        // This should not really happen since we already checked
        // that beatmapId is valid.
        console.error('Unexpected undefined: beatmap ID should be valid here.');
        // I don't like throwing here:
        return {
          isFailure: true,
          failureReason: 'beatmap not found',
        };
      }
      if (rawMapUserScores.length === 0) {
        continue;
      }
      const beatmapScores = rawMapUserScores.map(s =>
        this.beatmapUserScoresAdapter.createBeatmapScore(
          s,
          beatmap,
          beatmap.mode
        )
      );
      const beatmapScoreSortValues: {
        s: BeatmapScore<Mode, Hitcounts>;
        sortValue: number;
      }[] = await Promise.all(
        beatmapScores.map(async s => ({
          s: s,
          sortValue: await (async () => {
            const scorePp = s.pp !== null ? s.pp : await s.getEstimatedPp();
            if (scorePp === undefined) {
              return s.totalScore;
            }
            return scorePp;
          })(),
        }))
      );
      const offset = startPosition - 1;
      const playerScoresCollection: {
        playResult: OsuMapUserPlay;
        mapInfo: OsuMap;
      }[] = await Promise.all(
        beatmapScoreSortValues
          .sort((a, b) => b.sortValue - a.sortValue)
          .map((e, i) => ({pos: i + 1, score: e.s}))
          .slice(offset, offset + quantityPerUser)
          .map(async entry => {
            const pos = entry.pos;
            const mapScore = entry.score;
            const collection: {
              playResult: OsuMapUserPlay;
              mapInfo: OsuMap;
            } = {
              playResult: {
                sortedPosition: pos,
                mods: mapScore.mods.map(m => ({
                  acronym: m.acronym,
                  settings: m.settings,
                })),
                totalScore: mapScore.totalScore,
                combo: mapScore.maxCombo,
                accuracy: mapScore.accuracy,
                pp: await (async () => {
                  const fcAndSs =
                    scoreCount === 1 || estimatePpForAllScores
                      ? await getFcAndSsEstimations(mapScore)
                      : {fc: undefined, ss: undefined};
                  return {
                    value: mapScore.pp !== null ? mapScore.pp : undefined,
                    estimatedValue:
                      mapScore.pp !== null
                        ? mapScore.pp
                        : await mapScore.getEstimatedPp(),
                    ifFc: fcAndSs.fc,
                    ifSs: fcAndSs.ss,
                  };
                })(),
                orderedHitcounts: [...mapScore.hitcounts.orderedValues],
                grade: mapScore.rank,
                date: mapScore.endedAt.getTime(),
              },
              mapInfo: {
                beatmapset: {
                  id: mapScore.moddedBeatmap.beatmapset.id,
                  status: mapScore.moddedBeatmap.beatmapset.status,
                  artist: mapScore.moddedBeatmap.song.artist,
                  title: mapScore.moddedBeatmap.song.title,
                  creator: mapScore.moddedBeatmap.beatmapset.creatorUsername,
                  coverUrl: beatmap.beatmapset.coverUrl,
                },
                beatmap: {
                  id: mapScore.moddedBeatmap.id,
                  difficultyName: mapScore.moddedBeatmap.difficultyName,
                  totalLength: mapScore.moddedBeatmap.song.length,
                  drainLength: mapScore.moddedBeatmap.length,
                  bpm: mapScore.moddedBeatmap.song.bpm,
                  estimatedStarRating: await (async () => {
                    const starRatingEstimation =
                      mapScore.hasStarRatingChangingMods
                        ? await mapScore.getEstimatedStarRating()
                        : mapScore.baseBeatmap.starRating;
                    return starRatingEstimation;
                  })(),
                  ar: mapScore.moddedBeatmap.stats.ar,
                  cs: mapScore.moddedBeatmap.stats.cs,
                  od: mapScore.moddedBeatmap.stats.od,
                  hp: mapScore.moddedBeatmap.stats.hp,
                  maxCombo: mapScore.moddedBeatmap.maxCombo,
                  url: beatmap.url,
                },
              },
            };
            return collection;
          })
      );
      if (playerScoresCollection.length > 0) {
        bestScoresOutput.push({
          username: username,
          collection: playerScoresCollection,
        });
      }
    }
    return {
      isFailure: false,
      baseBeatmap: {
        beatmapset: {
          id: beatmap.beatmapset.id,
          status: beatmap.beatmapset.status,
          artist: beatmap.beatmapset.artist,
          title: beatmap.beatmapset.title,
          creator: beatmap.beatmapset.creator,
          coverUrl: beatmap.beatmapset.coverUrl,
        },
        beatmap: {
          id: beatmap.id,
          difficultyName: beatmap.version,
          totalLength: beatmap.totalLength,
          drainLength: beatmap.hitLength,
          bpm: beatmap.bpm,
          estimatedStarRating: beatmap.difficultyRating,
          ar: beatmap.ar,
          cs: beatmap.cs,
          od: beatmap.od,
          hp: beatmap.hp,
          maxCombo: beatmap.maxCombo,
          url: beatmap.url,
        },
      },
      mapPlays: bestScoresOutput,
      ruleset: beatmap.mode,
      missingUsernames: missingUsernames,
    };
  }
}

async function getFcAndSsEstimations(
  score: BeatmapScore<Mode, Hitcounts>
): Promise<{
  fc: number | undefined;
  ss: number | undefined;
}> {
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

async function getOsuFcAndSsEstimations(
  score: BeatmapScore<ModeOsu, HitcountsOsu>
): Promise<{
  fc: number | undefined;
  ss: number | undefined;
}> {
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
    fc: await fcScore.getEstimatedPp(),
    ss: await ssScore.getEstimatedPp(),
  };
}

async function getTaikoFcAndSsEstimations(
  score: BeatmapScore<ModeTaiko, HitcountsTaiko>
): Promise<{
  fc: number | undefined;
  ss: number | undefined;
}> {
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
    fc: await fcScore.getEstimatedPp(),
    ss: await ssScore.getEstimatedPp(),
  };
}

async function getCtbFcAndSsEstimations(
  score: BeatmapScore<ModeCtb, HitcountsCtb>
): Promise<{
  fc: number | undefined;
  ss: number | undefined;
}> {
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
    fc: await fcScore.getEstimatedPp(),
    ss: await ssScore.getEstimatedPp(),
  };
}

async function getManiaFcAndSsEstimations(
  score: BeatmapScore<ModeMania, HitcountsMania>
): Promise<{
  fc: number | undefined;
  ss: number | undefined;
}> {
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
    fc: await fcScore.getEstimatedPp(),
    ss: await ssScore.getEstimatedPp(),
  };
}
