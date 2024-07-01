import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {BeatmapScore} from '../../../domain/entities/BeatmapScore';
import {Hitcounts} from '../../../domain/entities/hitcounts/Hitcounts';
import {Mode} from '../../../domain/entities/mode/Mode';
import {getMods} from './mods/Mods';
import {getHitcounts} from './Hitcounts';
import {getMapMaxCombo} from './MapMaxCombo';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';
import {getEstimationProviders} from './EstimationProviders';
import {Beatmap} from '../../../domain/entities/Beatmap';
import {getMode} from './Mode';
import {Beatmapset} from '../../../domain/entities/Beatmapset';
import {Song} from '../../../domain/entities/Song';
import {OsuBeatmapUserScore} from '../../requirements/dao/OsuBeatmapUserScoresDao';
import {OsuBeatmap} from '../../requirements/dao/OsuBeatmapsDao';

export class BeatmapUserScoreAdapter {
  scoreSimulations: ScoreSimulationsDao;

  constructor(scoreSimulations: ScoreSimulationsDao) {
    this.scoreSimulations = scoreSimulations;
  }

  createBeatmapScore(
    score: OsuBeatmapUserScore,
    map: OsuBeatmap,
    ruleset: OsuRuleset
  ): BeatmapScore<Mode, Hitcounts> {
    const [starRatingEstimationProvider, ppEstimationProvider] =
      getEstimationProviders(ruleset, this.scoreSimulations);
    return new BeatmapScore({
      id: score.id,
      endedAt: new Date(Date.parse(score.endedAt)),
      passed: true,
      mapProgress: 1,
      mods: getMods(score, ruleset),
      totalScore: score.totalScore,
      maxCombo: score.maxCombo,
      hitcounts: getHitcounts(score, ruleset),
      accuracy: score.accuracy,
      rank: score.rank,
      pp: score.pp,
      baseBeatmap: new Beatmap({
        id: map.id,
        mode: getMode(ruleset),
        difficultyName: map.version,
        stats: {
          ar: map.ar,
          cs: map.cs,
          od: map.od,
          hp: map.hp,
        },
        starRating: map.difficultyRating,
        length: map.hitLength,
        maxCombo: getMapMaxCombo(map, score, ruleset),
        beatmapset: new Beatmapset({
          id: map.beatmapset.id,
          creatorId: map.beatmapset.userId,
          creatorUsername: map.beatmapset.creator,
          status: map.beatmapset.status,
        }),
        song: new Song({
          artist: map.beatmapset.artist,
          title: map.beatmapset.title,
          bpm: map.beatmapset.bpm,
          length: map.totalLength,
        }),
      }),
      starRatingEstimationProvider: starRatingEstimationProvider,
      ppEstimationProvider: ppEstimationProvider,
    });
  }
}
