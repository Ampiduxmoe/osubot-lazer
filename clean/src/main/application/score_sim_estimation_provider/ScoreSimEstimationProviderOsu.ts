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

  starRatingEstimationProvider: StarRatingEstimationProviderOsu;
  ppEstimationProvider: PpEstimationProviderOsu;

  scoreSimulations: ScoreSimulationsDao;
  constructor(scoreSimulations: ScoreSimulationsDao) {
    this.scoreSimulations = scoreSimulations;

    this.starRatingEstimationProvider = (() => {
      const cache = this.simulationCache;
      const scoreSims = this.scoreSimulations;
      return {
        async getEstimation(
          score: BeatmapScoreOsu
        ): Promise<number | undefined> {
          const cachedResult = cache.find(x => x.score === score);
          if (cachedResult) {
            return (await cachedResult.result)?.difficultyAttributes.starRating;
          }
          const simulationPromise = scoreSims.getForOsu(
            score.baseBeatmap.id,
            score.mods.map(m => m.acronym),
            score.maxCombo === SCORE_FULL_COMBO ? null : score.maxCombo,
            Math.round(score.hitcounts.miss / score.mapProgress),
            Math.round(score.hitcounts.meh / score.mapProgress),
            Math.round(score.hitcounts.ok / score.mapProgress),
            getSimulationParams(score)
          );
          cache.push({
            score: score,
            result: simulationPromise,
          });
          if (cache.length > 50) {
            cache.splice(0, 25);
          }
          return (await simulationPromise)?.difficultyAttributes.starRating;
        },
      };
    })();

    this.ppEstimationProvider = (() => {
      const cache = this.simulationCache;
      const scoreSims = this.scoreSimulations;
      return {
        async getEstimation(
          score: BeatmapScoreOsu
        ): Promise<number | undefined> {
          const cachedResult = cache.find(x => x.score === score);
          if (cachedResult) {
            return (await cachedResult.result)?.performanceAttributes.pp;
          }
          const simulationPromise = scoreSims.getForOsu(
            score.baseBeatmap.id,
            score.mods.map(m => m.acronym),
            score.maxCombo,
            score.hitcounts.miss,
            score.hitcounts.meh,
            score.hitcounts.ok,
            getSimulationParams(score)
          );
          cache.push({
            score: score,
            result: simulationPromise,
          });
          if (cache.length > 50) {
            cache.splice(0, 25);
          }
          return (await simulationPromise)?.performanceAttributes.pp;
        },
      };
    })();
  }
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
