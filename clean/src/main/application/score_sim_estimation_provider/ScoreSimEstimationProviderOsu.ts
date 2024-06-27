import {
  BeatmapScore,
  SCORE_FULL_COMBO,
} from '../../domain/entities/BeatmapScore';
import {HitcountsOsu} from '../../domain/entities/hitcounts/HitcountsOsu';
import {ModeOsu} from '../../domain/entities/mode/ModeOsu';
import {Daycore} from '../../domain/entities/mods/osu/Daycore';
import {DifficultyAdjust} from '../../domain/entities/mods/osu/DifficultyAdjust';
import {DoubleTime} from '../../domain/entities/mods/osu/DoubleTime';
import {HalfTime} from '../../domain/entities/mods/osu/HalfTime';
import {Nightcore} from '../../domain/entities/mods/osu/Nighcore';
import {PpEstimationProvider} from '../../domain/requirements/PpEstimationProvider';
import {StarRatingEstimationProvider} from '../../domain/requirements/StarRatingEstimationProvider';
import {
  ScoreSimulationsDao,
  SimulatedScoreOsu,
} from '../requirements/dao/ScoreSimulationsDao';

export class ScoreSimEstimationProviderOsu {
  simulationCache: {
    score: BeatmapScoreOsu;
    result: Promise<SimulatedScoreOsu | undefined>;
  }[] = [];
  totalHitsCache: Record<number, number> = {};

  starRatingEstimationProvider: StarRatingEstimationProviderOsu;
  ppEstimationProvider: PpEstimationProviderOsu;

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
      const hitsCache = this.totalHitsCache;
      const scoreSims = this.scoreSimulations;
      return {
        async getEstimation(
          score: BeatmapScoreOsu
        ): Promise<number | undefined> {
          const cachedResult = simCache.find(x => x.score === score);
          if (cachedResult) {
            return (await cachedResult.result)?.difficultyAttributes.starRating;
          }
          const simulationPromise = getScoreSimPromise(
            score,
            scoreSims,
            hitsCache,
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
          score: BeatmapScoreOsu
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
  score: BeatmapScoreOsu,
  scoreSimulations: ScoreSimulationsDao,
  totalHitsCache: Record<number, number>,
  useAccuracy: boolean
): Promise<SimulatedScoreOsu | undefined> {
  if (!useAccuracy) {
    return scoreSimulations.getForOsu(
      score.baseBeatmap.id,
      score.mods.map(m => m.acronym),
      score.maxCombo === SCORE_FULL_COMBO ? null : score.maxCombo,
      Math.round(score.hitcounts.miss / score.mapProgress),
      Math.round(score.hitcounts.meh / score.mapProgress),
      Math.round(score.hitcounts.ok / score.mapProgress),
      getSimulationParams(score)
    );
  }
  const getSsScoreSim = () =>
    scoreSimulations.getForOsu(
      score.baseBeatmap.id,
      score.mods.map(m => m.acronym),
      null,
      0,
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
  const count50 = Math.round(score.hitcounts.meh / score.mapProgress);

  // we still respect number of misses and 50s
  const hitsAvailable = totalHits - countMiss - count50;

  // accuracy = (6 * count300 + 2 * count100 + 1 * count50) / (6 * totalhits)
  // let count300 = x, then count100 = hitsAvailable - x
  // accuracy = (6x + 2 * (hitsAvailable - x) + count50) / (6 * totalHits)
  // accuracy * 6 * totalHits = 6x + 2 * hitsAvailable - 2x + count50
  // 4x = 6 * totalHits * accuracy - 2 * hitsAvailable - count50
  const th = totalHits;
  const acc = score.accuracy / 100;
  const ha = hitsAvailable;
  const c50 = count50;
  const x = Math.round((6 * th * acc - 2 * ha - c50) / 4);
  if (x < 0 || x > hitsAvailable) {
    return undefined;
  }
  const count300 = x;
  const count100 = hitsAvailable - count300;

  return scoreSimulations.getForOsu(
    score.baseBeatmap.id,
    score.mods.map(m => m.acronym),
    score.maxCombo === SCORE_FULL_COMBO ? null : score.maxCombo,
    countMiss,
    count50,
    count100,
    getSimulationParams(score)
  );
}

function getSimulationParams(
  score: BeatmapScoreOsu
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
    m => m instanceof DoubleTime || m instanceof Nightcore
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
      [da.settings.ar, da.settings.cs, da.settings.od, da.settings.hp].find(
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
    od?: number;
    hp?: number;
  };
};

type StarRatingEstimationProviderOsu = StarRatingEstimationProvider<
  ModeOsu,
  HitcountsOsu
>;
type PpEstimationProviderOsu = PpEstimationProvider<ModeOsu, HitcountsOsu>;
type BeatmapScoreOsu = BeatmapScore<ModeOsu, HitcountsOsu>;
