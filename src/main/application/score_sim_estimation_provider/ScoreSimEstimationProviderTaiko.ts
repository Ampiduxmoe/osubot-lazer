import {
  BeatmapScore,
  SCORE_FULL_COMBO,
} from '../../domain/entities/BeatmapScore';
import {HitcountsTaiko} from '../../domain/entities/hitcounts/HitcountsTaiko';
import {ModeTaiko} from '../../domain/entities/mode/ModeTaiko';
import {Daycore} from '../../domain/entities/mods/taiko/Daycore';
import {DifficultyAdjust} from '../../domain/entities/mods/taiko/DifficultyAdjust';
import {DoubleTime} from '../../domain/entities/mods/taiko/DoubleTime';
import {HalfTime} from '../../domain/entities/mods/taiko/HalfTime';
import {Nightcore} from '../../domain/entities/mods/taiko/Nighcore';
import {PpEstimationProvider} from '../../domain/requirements/PpEstimationProvider';
import {StarRatingEstimationProvider} from '../../domain/requirements/StarRatingEstimationProvider';
import {
  ScoreSimulationsDao,
  SimulatedScoreTaiko,
} from '../requirements/dao/ScoreSimulationsDao';

export class ScoreSimEstimationProviderTaiko {
  simulationCache: {
    score: BeatmapScoreTaiko;
    result: Promise<SimulatedScoreTaiko | undefined>;
  }[] = [];
  totalHitsCache: Record<number, number> = {};

  starRatingEstimationProvider: StarRatingEstimationProviderTaiko;
  ppEstimationProvider: PpEstimationProviderTaiko;

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
      const totalHitsCache = this.totalHitsCache;
      const scoreSims = this.scoreSimulations;
      return {
        async getEstimation(
          score: BeatmapScoreTaiko
        ): Promise<number | undefined> {
          const cachedResult = simCache.find(x => x.score === score);
          if (cachedResult) {
            return (await cachedResult.result)?.difficultyAttributes.starRating;
          }
          const simulationPromise = getScoreSimPromise(
            score,
            scoreSims,
            totalHitsCache,
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
      const totalHitsCache = this.totalHitsCache;
      const scoreSims = this.scoreSimulations;
      return {
        async getEstimation(
          score: BeatmapScoreTaiko
        ): Promise<number | undefined> {
          const cachedResult = simCache.find(x => x.score === score);
          if (cachedResult) {
            return (await cachedResult.result)?.performanceAttributes.pp;
          }
          const simulationPromise = getScoreSimPromise(
            score,
            scoreSims,
            totalHitsCache,
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
  score: BeatmapScoreTaiko,
  scoreSimulations: ScoreSimulationsDao,
  totalHitsCache: Record<number, number>,
  useAccuracy: boolean
): Promise<SimulatedScoreTaiko | undefined> {
  if (!useAccuracy) {
    return scoreSimulations.getForTaiko(
      score.baseBeatmap.id,
      score.mods.map(m => m.acronym),
      score.maxCombo === SCORE_FULL_COMBO ? null : score.maxCombo,
      Math.round(score.hitcounts.miss / score.mapProgress),
      Math.round(score.hitcounts.ok / score.mapProgress),
      getSimulationParams(score)
    );
  }
  const getSsScoreSim = () =>
    scoreSimulations.getForTaiko(
      score.baseBeatmap.id,
      score.mods.map(m => m.acronym),
      null,
      0,
      0,
      getSimulationParams(score)
    );
  if (score.accuracy === 100) {
    const ssScore = await getSsScoreSim();
    if (ssScore !== undefined) {
      totalHitsCache[score.baseBeatmap.id] = ssScore.score.statistics.great;
    }
    return ssScore;
  }
  const totalHits: number | undefined = await (async () => {
    const cachedValue = totalHitsCache[score.baseBeatmap.id];
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    const ssScore = await getSsScoreSim();
    if (ssScore === undefined) {
      return undefined;
    }
    totalHitsCache[score.baseBeatmap.id] = ssScore.score.statistics.great;
    return ssScore.score.statistics.great;
  })();
  if (totalHits === undefined) {
    // we can't calculate hitcounts to match this accuracy
    return undefined;
  }
  const countMiss = Math.round(score.hitcounts.miss / score.mapProgress);

  // we still respect number of misses
  const hitsAvailable = totalHits - countMiss;

  // accuracy = (2 * count300 + 1 * count150) / (2 * totalhits)
  // let count300 = x, then count150 = hitsAvailable - x
  // accuracy = (2x + 1 * (hitsAvailable - x)) / (2 * totalHits)
  // accuracy * 2 * totalHits = 2x + hitsAvailable - x
  // x = 2 * totalHits * accuracy - hitsAvailable
  const th = totalHits;
  const acc = score.accuracy;
  const ha = hitsAvailable;
  const x = Math.round(2 * th * acc - ha);
  if (x < 0 || x > hitsAvailable) {
    throw Error('Impossible score requested');
  }
  const count300 = x;
  const count150 = hitsAvailable - count300;

  return scoreSimulations.getForTaiko(
    score.baseBeatmap.id,
    score.mods.map(m => m.acronym),
    score.maxCombo === SCORE_FULL_COMBO ? null : score.maxCombo,
    countMiss,
    count150,
    getSimulationParams(score)
  );
}

function getSimulationParams(
  score: BeatmapScoreTaiko
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

type StarRatingEstimationProviderTaiko = StarRatingEstimationProvider<
  ModeTaiko,
  HitcountsTaiko
>;
type PpEstimationProviderTaiko = PpEstimationProvider<
  ModeTaiko,
  HitcountsTaiko
>;
type BeatmapScoreTaiko = BeatmapScore<ModeTaiko, HitcountsTaiko>;
