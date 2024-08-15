import {BeatmapScore} from '../../domain/entities/BeatmapScore';
import {HitcountsTaiko} from '../../domain/entities/hitcounts/HitcountsTaiko';
import {ModeTaiko} from '../../domain/entities/mode/ModeTaiko';
import {PpEstimationProvider} from '../../domain/requirements/PpEstimationProvider';
import {StarRatingEstimationProvider} from '../../domain/requirements/StarRatingEstimationProvider';
import {
  ScoreSimulationsDao,
  SimulatedScoreTaiko,
} from '../requirements/dao/ScoreSimulationsDao';

// TODO
export class ScoreSimEstimationProviderTaiko {
  simulationCache: {
    score: BeatmapScoreTaiko;
    result: Promise<SimulatedScoreTaiko | undefined>;
  }[] = [];

  constructor(protected scoreSimulations: ScoreSimulationsDao) {}

  starRatingEstimationProvider: StarRatingEstimationProviderTaiko = (() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cache = this.simulationCache;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const scoreSims = this.scoreSimulations;
    return {
      async getEstimation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        score: BeatmapScoreTaiko
      ): Promise<number | undefined> {
        return undefined;
      },
    };
  })();

  ppEstimationProvider: PpEstimationProviderTaiko = (() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cache = this.simulationCache;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const scoreSims = this.scoreSimulations;
    return {
      async getEstimation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        score: BeatmapScoreTaiko
      ): Promise<number | undefined> {
        return undefined;
      },
    };
  })();
}

type StarRatingEstimationProviderTaiko = StarRatingEstimationProvider<
  ModeTaiko,
  HitcountsTaiko
>;
type PpEstimationProviderTaiko = PpEstimationProvider<
  ModeTaiko,
  HitcountsTaiko
>;
type BeatmapScoreTaiko = BeatmapScore<ModeTaiko, HitcountsTaiko>;
