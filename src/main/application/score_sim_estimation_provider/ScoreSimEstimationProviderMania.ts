import {BeatmapScore} from '../../domain/entities/BeatmapScore';
import {HitcountsMania} from '../../domain/entities/hitcounts/HitcountsMania';
import {ModeMania} from '../../domain/entities/mode/ModeMania';
import {Daycore} from '../../domain/entities/mods/mania/Daycore';
import {DifficultyAdjust} from '../../domain/entities/mods/mania/DifficultyAdjust';
import {DoubleTime} from '../../domain/entities/mods/mania/DoubleTime';
import {HalfTime} from '../../domain/entities/mods/mania/HalfTime';
import {Nightcore} from '../../domain/entities/mods/mania/Nighcore';
import {PpEstimationProvider} from '../../domain/requirements/PpEstimationProvider';
import {StarRatingEstimationProvider} from '../../domain/requirements/StarRatingEstimationProvider';
import {
  ScoreSimulationsDao,
  SimulatedScoreMania,
} from '../requirements/dao/ScoreSimulationsDao';

export class ScoreSimEstimationProviderMania {
  simulationCache: {
    score: BeatmapScoreMania;
    result: Promise<SimulatedScoreMania | undefined>;
  }[] = [];

  starRatingEstimationProvider: StarRatingEstimationProviderMania;
  ppEstimationProvider: PpEstimationProviderMania;

  scoreSimulations: ScoreSimulationsDao;
  constructor({
    scoreSimulations,
    useAccuracy,
  }: {
    scoreSimulations: ScoreSimulationsDao;
    useAccuracy: boolean;
  }) {
    this.scoreSimulations = scoreSimulations;

    this.starRatingEstimationProvider = (() => {
      const simCache = this.simulationCache;
      const scoreSims = this.scoreSimulations;
      return {
        async getEstimation(
          score: BeatmapScoreMania
        ): Promise<number | undefined> {
          const cachedResult = simCache.find(x => x.score === score);
          if (cachedResult) {
            return (await cachedResult.result)?.difficultyAttributes.starRating;
          }
          const simulationPromise = getScoreSimPromise(
            score,
            scoreSims,
            useAccuracy
          );
          simCache.push({
            score: score,
            result: simulationPromise,
          });
          if (simCache.length > 50) {
            simCache.splice(0, 25);
          }
          return (await simulationPromise)?.difficultyAttributes.starRating;
        },
      };
    })();

    this.ppEstimationProvider = (() => {
      const simCache = this.simulationCache;
      const scoreSims = this.scoreSimulations;
      return {
        async getEstimation(
          score: BeatmapScoreMania
        ): Promise<number | undefined> {
          const cachedResult = simCache.find(x => x.score === score);
          if (cachedResult) {
            return (await cachedResult.result)?.performanceAttributes.pp;
          }
          const simulationPromise = getScoreSimPromise(
            score,
            scoreSims,
            useAccuracy
          );
          simCache.push({
            score: score,
            result: simulationPromise,
          });
          if (simCache.length > 50) {
            simCache.splice(0, 25);
          }
          return (await simulationPromise)?.performanceAttributes.pp;
        },
      };
    })();
  }
}

async function getScoreSimPromise(
  score: BeatmapScoreMania,
  scoreSimulations: ScoreSimulationsDao,
  useAccuracy: boolean
): Promise<SimulatedScoreMania | undefined> {
  if (useAccuracy) {
    return scoreSimulations.getForMania(
      score.baseBeatmap.id,
      score.mods.map(m => m.acronym),
      undefined,
      {accuracy: score.accuracy * 100, miss: score.hitcounts.miss},
      getSimulationParams(score)
    );
  }
  return scoreSimulations.getForMania(
    score.baseBeatmap.id,
    score.mods.map(m => m.acronym),
    {
      perfect: score.hitcounts.perfect,
      great: score.hitcounts.great,
      good: score.hitcounts.good,
      ok: score.hitcounts.ok,
      meh: score.hitcounts.meh,
      miss: score.hitcounts.miss,
    },
    undefined,
    getSimulationParams(score)
  );
}

function getSimulationParams(
  score: BeatmapScoreMania
): SimulationParams | undefined {
  let simulationParams: SimulationParams | undefined = undefined;
  const mods = score.mods;
  const dtLike: DoubleTime | Nightcore | undefined = mods.find(
    m => m instanceof DoubleTime || m instanceof Nightcore
  );
  if (dtLike !== undefined) {
    const speedChange = dtLike.settings.speedChange;
    const defaultValue = DoubleTime.DefaultSettings.speedChange;
    if (speedChange !== undefined && speedChange !== defaultValue) {
      simulationParams = {dtRate: speedChange};
    }
  }
  const htLike: HalfTime | Daycore | undefined = mods.find(
    m => m instanceof HalfTime || m instanceof Daycore
  );
  if (htLike !== undefined) {
    const speedChange = htLike.settings.speedChange;
    const defaultValue = HalfTime.DefaultSettings.speedChange;
    if (speedChange !== undefined && speedChange !== defaultValue) {
      simulationParams = {htRate: speedChange};
    }
  }
  const da: DifficultyAdjust | undefined = score.mods.find(
    m => m instanceof DifficultyAdjust
  );
  if (da !== undefined) {
    const hasAnyChanges =
      [da.settings.od, da.settings.hp].find(x => x !== undefined) !== undefined;
    if (hasAnyChanges) {
      simulationParams ??= {};
      simulationParams.difficultyAdjust = da.settings;
    }
  }
  return simulationParams;
}

type SimulationParams = {
  dtRate?: number;
  htRate?: number;
  difficultyAdjust?: {
    od?: number;
    hp?: number;
  };
};

type StarRatingEstimationProviderMania = StarRatingEstimationProvider<
  ModeMania,
  HitcountsMania
>;
type PpEstimationProviderMania = PpEstimationProvider<
  ModeMania,
  HitcountsMania
>;
type BeatmapScoreMania = BeatmapScore<ModeMania, HitcountsMania>;
