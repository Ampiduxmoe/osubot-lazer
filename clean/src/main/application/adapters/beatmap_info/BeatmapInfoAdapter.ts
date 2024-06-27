import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {BeatmapScore} from '../../../domain/entities/BeatmapScore';
import {Hitcounts} from '../../../domain/entities/hitcounts/Hitcounts';
import {Mode} from '../../../domain/entities/mode/Mode';
import {OsuBeatmap} from '../../requirements/dao/OsuBeatmapsDao';
import {getHitcounts} from './Hitcounts';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';
import {getEstimationProviders} from './EstimationProviders';
import {Beatmap} from '../../../domain/entities/Beatmap';
import {getMode} from './Mode';
import {Beatmapset} from '../../../domain/entities/Beatmapset';
import {Song} from '../../../domain/entities/Song';

export class BeatmapInfoAdapter {
  scoreSimulations: ScoreSimulationsDao;

  constructor(scoreSimulations: ScoreSimulationsDao) {
    this.scoreSimulations = scoreSimulations;
  }

  createBeatmapScore({
    map,
    ruleset,
    useAccuracyForPp,
  }: {
    map: OsuBeatmap;
    ruleset: OsuRuleset;
    useAccuracyForPp: boolean;
  }): BeatmapScore<Mode, Hitcounts> {
    const [starRatingEstimationProvider, ppEstimationProvider] =
      getEstimationProviders({
        ruleset: ruleset,
        scoreSimulations: this.scoreSimulations,
        useAccuracy: useAccuracyForPp,
      });
    return new BeatmapScore({
      id: map.id,
      endedAt: new Date(),
      passed: true,
      mapProgress: 1,
      mods: [],
      totalScore: 1e6,
      maxCombo: map.maxCombo,
      hitcounts: getHitcounts(ruleset),
      accuracy: 100,
      rank: 'S',
      pp: null,
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
        maxCombo: map.maxCombo,
        beatmapset: new Beatmapset({
          id: map.beatmapset.id,
          creatorId: map.beatmapset.userId,
          creatorUsername: map.beatmapset.creator,
          status: map.beatmapset.status,
        }),
        song: new Song({
          artist: map.beatmapset.artist,
          title: map.beatmapset.title,
          bpm: map.bpm,
          length: map.totalLength,
        }),
      }),
      starRatingEstimationProvider: starRatingEstimationProvider,
      ppEstimationProvider: ppEstimationProvider,
    });
  }
}
