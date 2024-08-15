import {BeatmapScore} from '../../domain/entities/BeatmapScore';
import {HitcountsCtb} from '../../domain/entities/hitcounts/HitcountsCtb';
import {ModeCtb} from '../../domain/entities/mode/ModeCtb';
import {PpEstimationProvider} from '../../domain/requirements/PpEstimationProvider';
import {StarRatingEstimationProvider} from '../../domain/requirements/StarRatingEstimationProvider';
import {
  ScoreSimulationsDao,
  SimulatedScoreCtb,
} from '../requirements/dao/ScoreSimulationsDao';

// TODO
export class ScoreSimEstimationProviderCtb {
  simulationCache: {
    score: BeatmapScoreCtb;
    result: Promise<SimulatedScoreCtb | undefined>;
  }[] = [];

  constructor(protected scoreSimulations: ScoreSimulationsDao) {}

  starRatingEstimationProvider: StarRatingEstimationProviderCtb = (() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cache = this.simulationCache;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const scoreSims = this.scoreSimulations;
    return {
      async getEstimation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        score: BeatmapScoreCtb
      ): Promise<number | undefined> {
        return undefined;
      },
    };
  })();

  ppEstimationProvider: PpEstimationProviderCtb = (() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cache = this.simulationCache;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const scoreSims = this.scoreSimulations;
    return {
      async getEstimation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        score: BeatmapScoreCtb
      ): Promise<number | undefined> {
        return undefined;
      },
    };
  })();
}

type StarRatingEstimationProviderCtb = StarRatingEstimationProvider<
  ModeCtb,
  HitcountsCtb
>;
type PpEstimationProviderCtb = PpEstimationProvider<ModeCtb, HitcountsCtb>;
type BeatmapScoreCtb = BeatmapScore<ModeCtb, HitcountsCtb>;
