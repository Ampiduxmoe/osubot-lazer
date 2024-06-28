import {Hitcounts} from './hitcounts/Hitcounts';
import {Mod} from './mods/Mod';
import {Beatmap} from './Beatmap';
import {StarRatingEstimationProvider} from '../requirements/StarRatingEstimationProvider';
import {PpEstimationProvider} from '../requirements/PpEstimationProvider';
import {Mode} from './mode/Mode';

export class BeatmapScore<
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

  readonly hasStarRatingChangingMods: boolean;

  readonly baseBeatmap: Beatmap<ModeType>;
  readonly moddedBeatmap: Beatmap<ModeType>;

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
    baseBeatmap,
    starRatingEstimationProvider,
    ppEstimationProvider,
  }: {
    id: number;
    endedAt: Date;
    passed: boolean;
    mapProgress: number;
    mods: readonly Mod<ModeType, object>[];
    totalScore: number;
    maxCombo: number;
    hitcounts: HitcountsType;
    accuracy: number;
    rank: BeatmapScoreRank;
    pp: number | null;
    baseBeatmap: Beatmap<ModeType>;
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

    this.baseBeatmap = baseBeatmap;
    this.hasStarRatingChangingMods = (() => {
      const scoreMods = this.mods.map(x => x.acronym);
      const starRatingChangingMods =
        this.baseBeatmap.mode.starRatingChangingMods;
      return (
        scoreMods.find(m => m.isAnyOf(...starRatingChangingMods)) !== undefined
      );
    })();
    this.moddedBeatmap = (() => {
      let beatmap = this.baseBeatmap;
      for (const acronym of beatmap.mode.modApplyOrder) {
        const modToApply = this.mods.find(m => m.acronym.is(acronym));
        if (modToApply !== undefined) {
          beatmap = modToApply.apply(beatmap);
        }
      }
      if (this.hasStarRatingChangingMods) {
        return beatmap.copy({starRating: NaN});
      }
      return beatmap;
    })();

    this.starRatingEstimationProvider = starRatingEstimationProvider;
    this.ppEstimationProvider = ppEstimationProvider;
  }

  copy({
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
    baseBeatmap,
    starRatingEstimationProvider,
    ppEstimationProvider,
  }: {
    id?: number;
    endedAt?: Date;
    passed?: boolean;
    mapProgress?: number;
    mods?: readonly Mod<ModeType, object>[];
    totalScore?: number;
    maxCombo?: number;
    hitcounts?: HitcountsType;
    accuracy?: number;
    rank?: BeatmapScoreRank;
    pp?: number | null;
    baseBeatmap?: Beatmap<ModeType>;
    starRatingEstimationProvider?: StarRatingEstimationProvider<
      ModeType,
      HitcountsType
    >;
    ppEstimationProvider?: PpEstimationProvider<ModeType, HitcountsType>;
  }) {
    return new BeatmapScore({
      id: id ?? this.id,
      endedAt: endedAt ?? this.endedAt,
      passed: passed ?? this.passed,
      mapProgress: mapProgress ?? this.mapProgress,
      mods: mods ?? this.mods,
      totalScore: totalScore ?? this.totalScore,
      maxCombo: maxCombo ?? this.maxCombo,
      hitcounts: hitcounts ?? this.hitcounts,
      accuracy: accuracy ?? this.accuracy,
      rank: rank ?? this.rank,
      pp: pp !== undefined ? pp : this.pp,
      baseBeatmap: baseBeatmap ?? this.baseBeatmap,
      starRatingEstimationProvider:
        starRatingEstimationProvider ?? this.starRatingEstimationProvider,
      ppEstimationProvider: ppEstimationProvider ?? this.ppEstimationProvider,
    });
  }
}

export const SCORE_FULL_COMBO: number = Number.POSITIVE_INFINITY;

export type BeatmapScoreRank = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
