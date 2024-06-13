import {Hitcounts} from './hitcounts/Hitcounts';
import {Mod} from './mods/Mod';
import {Beatmap} from './Beatmap';
import {StarRatingEstimationProvider} from '../requirements/StarRatingEstimationProvider';
import {PpEstimationProvider} from '../requirements/PpEstimationProvider';
import {Mode} from './mode/Mode';

export abstract class BeatmapScore<
  ModeType extends Mode,
  HitcountsType extends Hitcounts,
> {
  readonly id: number;
  readonly endedAt: Date;
  readonly passed: boolean;
  readonly mapProgress: number;
  readonly mods: readonly Mod<ModeType, object>[];
  readonly totalScore: number;
  readonly maxCombo: number;
  readonly hitcounts: HitcountsType;
  readonly accuracy: number;
  readonly rank: BeatmapScoreRank;
  readonly pp: number | null;

  readonly hasStarRatingChangingMods: boolean = (() => {
    const mode = this.baseBeatmap.mode;
    const starRatingChangingModsLowercase = mode.modApplyOrder.map(x =>
      x.toLowerCase()
    );
    const scoreModsLowercase = this.mods.map(x => x.acronym.toLowerCase());
    for (const acronym in starRatingChangingModsLowercase) {
      if (scoreModsLowercase.includes(acronym)) {
        return true;
      }
    }
    return false;
  })();

  readonly baseBeatmap: Beatmap<ModeType>;
  readonly moddedBeatmap: Beatmap<ModeType> = (() => {
    let beatmap = this.baseBeatmap;
    const mode = beatmap.mode;
    const modApplyOrderLowercase = mode.modApplyOrder.map(x => x.toLowerCase());
    for (const acronym in modApplyOrderLowercase) {
      const scoreMod = this.mods.find(m => m.acronym.toLowerCase() === acronym);
      if (scoreMod !== undefined) {
        beatmap = scoreMod.apply(beatmap);
      }
    }
    if (this.hasStarRatingChangingMods) {
      return beatmap.copy({starRating: NaN});
    }
    return beatmap;
  })();

  private starRatingEstimationProvider: StarRatingEstimationProvider<
    ModeType,
    HitcountsType
  >;
  getEstimatedStarRating: () => Promise<number | undefined> = (() => {
    let starRatingEstimationPromise: Promise<number | undefined> | null = null;
    return () => {
      if (starRatingEstimationPromise === null) {
        starRatingEstimationPromise =
          this.starRatingEstimationProvider.getEstimation(this);
      }
      return starRatingEstimationPromise;
    };
  })();

  private ppEstimationProvider: PpEstimationProvider<ModeType, HitcountsType>;
  getEstimatedPp: () => Promise<number | undefined> = (() => {
    let ppEstimationPromise: Promise<number | undefined> | null = null;
    return () => {
      if (ppEstimationPromise === null) {
        ppEstimationPromise = this.ppEstimationProvider.getEstimation(this);
      }
      return ppEstimationPromise;
    };
  })();

  constructor({
    id,
    endedAt,
    passed,
    mapProgress,
    mods,
    totalScore,
    maxCombo,
    hitcounts,
    accuracy,
    rank,
    pp,
    starRatingEstimationProvider,
    ppEstimationProvider,
  }: {
    id: number;
    endedAt: Date;
    passed: boolean;
    mapProgress: number;
    mods: Mod<ModeType, object>[];
    totalScore: number;
    maxCombo: number;
    hitcounts: HitcountsType;
    accuracy: number;
    rank: BeatmapScoreRank;
    pp: number | null;
    starRatingEstimationProvider: StarRatingEstimationProvider<
      ModeType,
      HitcountsType
    >;
    ppEstimationProvider: PpEstimationProvider<ModeType, HitcountsType>;
  }) {
    this.id = id;
    this.endedAt = endedAt;
    this.passed = passed;
    this.mapProgress = mapProgress;
    this.mods = mods;
    this.totalScore = totalScore;
    this.maxCombo = maxCombo;
    this.hitcounts = hitcounts;
    this.accuracy = accuracy;
    this.rank = rank;
    this.pp = pp;
    this.starRatingEstimationProvider = starRatingEstimationProvider;
    this.ppEstimationProvider = ppEstimationProvider;
  }
}

export type BeatmapScoreRank = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
