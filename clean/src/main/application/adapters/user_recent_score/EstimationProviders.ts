import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Hitcounts} from '../../../domain/entities/hitcounts/Hitcounts';
import {Mode} from '../../../domain/entities/mode/Mode';
import {PpEstimationProvider} from '../../../domain/requirements/PpEstimationProvider';
import {StarRatingEstimationProvider} from '../../../domain/requirements/StarRatingEstimationProvider';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';
import {ScoreSimEstimationProviderCtb} from '../../score_sim_estimation_provider/ScoreSimEstimationProviderCtb';
import {ScoreSimEstimationProviderMania} from '../../score_sim_estimation_provider/ScoreSimEstimationProviderMania';
import {ScoreSimEstimationProviderOsu} from '../../score_sim_estimation_provider/ScoreSimEstimationProviderOsu';
import {ScoreSimEstimationProviderTaiko} from '../../score_sim_estimation_provider/ScoreSimEstimationProviderTaiko';

export function getEstimationProviders(
  ruleset: OsuRuleset,
  scoreSimulations: ScoreSimulationsDao
): [
  StarRatingEstimationProvider<Mode, Hitcounts>,
  PpEstimationProvider<Mode, Hitcounts>,
] {
  switch (ruleset) {
    case OsuRuleset.osu: {
      const scoreSimProvider = new ScoreSimEstimationProviderOsu({
        scoreSimulations: scoreSimulations,
        useAccuracy: false,
      });
      return [
        scoreSimProvider.starRatingEstimationProvider,
        scoreSimProvider.ppEstimationProvider,
      ];
    }
    case OsuRuleset.taiko: {
      const scoreSimProvider = new ScoreSimEstimationProviderTaiko(
        scoreSimulations
      );
      return [
        scoreSimProvider.starRatingEstimationProvider,
        scoreSimProvider.ppEstimationProvider,
      ];
    }
    case OsuRuleset.ctb: {
      const scoreSimProvider = new ScoreSimEstimationProviderCtb(
        scoreSimulations
      );
      return [
        scoreSimProvider.starRatingEstimationProvider,
        scoreSimProvider.ppEstimationProvider,
      ];
    }
    case OsuRuleset.mania: {
      const scoreSimProvider = new ScoreSimEstimationProviderMania(
        scoreSimulations
      );
      return [
        scoreSimProvider.starRatingEstimationProvider,
        scoreSimProvider.ppEstimationProvider,
      ];
    }
  }
}
