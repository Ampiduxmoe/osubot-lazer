import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {BeatmapScore} from '../../../domain/entities/BeatmapScore';
import {Hitcounts} from '../../../domain/entities/hitcounts/Hitcounts';
import {Mode} from '../../../domain/entities/mode/Mode';
import {OsuUserRecentScore} from '../../requirements/dao/OsuUserRecentScoresDao';
import {getMods} from './mods/Mods';
import {getHitcounts} from './Hitcounts';
import {getMapMaxCombo} from './MapMaxCombo';
import {getMapProgress} from './MapProgress';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';
import {getEstimationProviders} from './EstimationProviders';
import {Beatmap} from '../../../domain/entities/Beatmap';
import {getMode} from './Mode';
import {Beatmapset} from '../../../domain/entities/Beatmapset';
import {Song} from '../../../domain/entities/Song';

export class UserRecentScoreAdapter {
  scoreSimulations: ScoreSimulationsDao;

  constructor(scoreSimulations: ScoreSimulationsDao) {
    this.scoreSimulations = scoreSimulations;
  }

  createBeatmapScore(
    score: OsuUserRecentScore,
    ruleset: OsuRuleset
  ): BeatmapScore<Mode, Hitcounts> {
    const [starRatingEstimationProvider, ppEstimationProvider] =
      getEstimationProviders(ruleset, this.scoreSimulations);
    return new BeatmapScore({
      id: score.id,
      endedAt: new Date(Date.parse(score.endedAt)),
      passed: score.passed,
      mapProgress: getMapProgress(score, ruleset),
      mods: getMods(score, ruleset),
      totalScore: score.totalScore,
      maxCombo: score.maxCombo,
      hitcounts: getHitcounts(score, ruleset),
      accuracy: score.accuracy,
      rank: score.rank,
      pp: score.pp,
      baseBeatmap: new Beatmap({
        id: score.beatmap.id,
        mode: getMode(ruleset),
        difficultyName: score.beatmap.version,
        stats: {
          ar: score.beatmap.ar,
          cs: score.beatmap.cs,
          od: score.beatmap.od,
          hp: score.beatmap.hp,
        },
        starRating: score.beatmap.difficultyRating,
        length: score.beatmap.hitLength,
        maxCombo: getMapMaxCombo(score, ruleset),
        beatmapset: new Beatmapset({
          id: score.beatmapset.id,
          creatorId: score.beatmapset.userId,
          creatorUsername: score.beatmapset.creator,
          status: score.beatmapset.status,
        }),
        song: new Song({
          artist: score.beatmapset.artist,
          title: score.beatmapset.title,
          bpm: score.beatmap.bpm,
          length: score.beatmap.totalLength,
        }),
      }),
      starRatingEstimationProvider: starRatingEstimationProvider,
      ppEstimationProvider: ppEstimationProvider,
    });
  }
}
