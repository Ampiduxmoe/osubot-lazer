import {BeatmapScore} from '../../domain/entities/BeatmapScore';
import {HitcountsMania} from '../../domain/entities/hitcounts/HitcountsMania';
import {ModeMania} from '../../domain/entities/mode/ModeMania';
import {PpEstimationProvider} from '../../domain/requirements/PpEstimationProvider';
import {StarRatingEstimationProvider} from '../../domain/requirements/StarRatingEstimationProvider';
import {
  ScoreSimulationsDao,
  SimulatedScoreMania,
} from '../requirements/dao/ScoreSimulationsDao';

// TODO
export class ScoreSimEstimationProviderMania {
  simulationCache: {
    score: BeatmapScoreMania;
    result: Promise<SimulatedScoreMania | undefined>;
  }[] = [];

  scoreSimulations: ScoreSimulationsDao;
  constructor(scoreSimulations: ScoreSimulationsDao) {
    this.scoreSimulations = scoreSimulations;
  }

  starRatingEstimationProvider: StarRatingEstimationProviderMania = (() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cache = this.simulationCache;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const scoreSims = this.scoreSimulations;
    return {
      async getEstimation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        score: BeatmapScoreMania
      ): Promise<number | undefined> {
        return undefined;
      },
    };
  })();

  ppEstimationProvider: PpEstimationProviderMania = (() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cache = this.simulationCache;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const scoreSims = this.scoreSimulations;
    return {
      async getEstimation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        score: BeatmapScoreMania
      ): Promise<number | undefined> {
        return undefined;
      },
    };
  })();
}

type StarRatingEstimationProviderMania = StarRatingEstimationProvider<
  ModeMania,
  HitcountsMania
>;
type PpEstimationProviderMania = PpEstimationProvider<
  ModeMania,
  HitcountsMania
>;
type BeatmapScoreMania = BeatmapScore<ModeMania, HitcountsMania>;
