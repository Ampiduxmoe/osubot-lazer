import {
  BeatmapScore,
  SCORE_FULL_COMBO,
} from '../../domain/entities/BeatmapScore';
import {HitcountsCtb} from '../../domain/entities/hitcounts/HitcountsCtb';
import {ModeCtb} from '../../domain/entities/mode/ModeCtb';
import {Daycore} from '../../domain/entities/mods/ctb/Daycore';
import {DifficultyAdjust} from '../../domain/entities/mods/ctb/DifficultyAdjust';
import {DoubleTime} from '../../domain/entities/mods/ctb/DoubleTime';
import {HalfTime} from '../../domain/entities/mods/ctb/HalfTime';
import {Nightcore} from '../../domain/entities/mods/ctb/Nighcore';
import {PpEstimationProvider} from '../../domain/requirements/PpEstimationProvider';
import {StarRatingEstimationProvider} from '../../domain/requirements/StarRatingEstimationProvider';
import {
  ScoreSimulationsDao,
  SimulatedScoreCtb,
} from '../requirements/dao/ScoreSimulationsDao';

export class ScoreSimEstimationProviderCtb {
  simulationCache: {
    score: BeatmapScoreCtb;
    result: Promise<SimulatedScoreCtb | undefined>;
  }[] = [];
  totalHitsCache: Record<number, CtbTotalHitcounts> = {};

  starRatingEstimationProvider: StarRatingEstimationProviderCtb;
  ppEstimationProvider: PpEstimationProviderCtb;

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
          score: BeatmapScoreCtb
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
          score: BeatmapScoreCtb
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
  score: BeatmapScoreCtb,
  scoreSimulations: ScoreSimulationsDao,
  totalHitsCache: Record<number, CtbTotalHitcounts>,
  useAccuracy: boolean
): Promise<SimulatedScoreCtb | undefined> {
  if (!useAccuracy) {
    return scoreSimulations.getForCtb(
      score.baseBeatmap.id,
      score.mods.map(m => m.acronym),
      score.maxCombo === SCORE_FULL_COMBO ? null : score.maxCombo,
      Math.round(score.hitcounts.miss / score.mapProgress),
      Math.round(score.hitcounts.smallTickMiss / score.mapProgress),
      Math.round(score.hitcounts.largeTickHit / score.mapProgress),
      getSimulationParams(score)
    );
  }
  const getSsScoreSim = () =>
    scoreSimulations.getForCtb(
      score.baseBeatmap.id,
      score.mods.map(m => m.acronym),
      null,
      0,
      0,
      undefined,
      getSimulationParams(score)
    );
  if (score.accuracy === 100) {
    const ssScore = await getSsScoreSim();
    if (ssScore !== undefined) {
      totalHitsCache[score.baseBeatmap.id] = {
        large:
          ssScore.score.statistics.great +
          ssScore.score.statistics.largeTickHit,
        small: ssScore.score.statistics.smallTickHit,
      };
    }
    return ssScore;
  }
  const totalHits: CtbTotalHitcounts | undefined = await (async () => {
    const cachedValue = totalHitsCache[score.baseBeatmap.id];
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    const ssScore = await getSsScoreSim();
    if (ssScore === undefined) {
      return undefined;
    }
    totalHitsCache[score.baseBeatmap.id] = {
      large:
        ssScore.score.statistics.great + ssScore.score.statistics.largeTickHit,
      small: ssScore.score.statistics.smallTickHit,
    };
    return totalHitsCache[score.baseBeatmap.id];
  })();
  if (totalHits === undefined) {
    // we can't calculate hitcounts to match this accuracy
    return undefined;
  }
  const allLargeMisses = Math.round(score.hitcounts.miss / score.mapProgress);

  // accuracy = (largeHits + smallHits) / (largeTotal + smallTotal)
  // let (largeTotal + smallTotal) be allTotal to make it shorter:
  // accuracy = (largeHits + smallHits) / allTotal
  // let smallHits be (smallTotal - smallMisses):
  // accuracy = (largeHits + smallTotal - smallMisses) / allTotal
  // let smallMisses = x
  // accuracy = (largeHits + smallTotal - x) / allTotal
  // accuracy * allTotal = largeHits + smallTotal - x
  // x = largeHits + smallTotal - accuracy * allTotal
  const lh = totalHits.large - allLargeMisses;
  const st = totalHits.small;
  const acc = score.accuracy;
  const at = totalHits.large + totalHits.small;
  const x = Math.round(lh + st - acc * at);
  if (x < 0 || x > totalHits.small) {
    throw Error('Impossible score requested');
  }
  const smallTickMiss = x;

  return scoreSimulations.getForCtb(
    score.baseBeatmap.id,
    score.mods.map(m => m.acronym),
    score.maxCombo === SCORE_FULL_COMBO ? null : score.maxCombo,
    allLargeMisses,
    smallTickMiss,
    score.hitcounts.largeTickHit,
    getSimulationParams(score)
  );
}

function getSimulationParams(
  score: BeatmapScoreCtb
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
      [da.settings.ar, da.settings.cs, da.settings.hp].find(
        x => x !== undefined
      ) !== undefined;
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
    ar?: number;
    cs?: number;
    hp?: number;
  };
};

type StarRatingEstimationProviderCtb = StarRatingEstimationProvider<
  ModeCtb,
  HitcountsCtb
>;
type PpEstimationProviderCtb = PpEstimationProvider<ModeCtb, HitcountsCtb>;
type BeatmapScoreCtb = BeatmapScore<ModeCtb, HitcountsCtb>;

type CtbTotalHitcounts = {
  large: number;
  small: number;
};
