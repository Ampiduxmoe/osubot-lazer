import {BeatmapScore} from '../entities/BeatmapScore';
import {Hitcounts} from '../entities/hitcounts/Hitcounts';
import {Mode} from '../entities/mode/Mode';

export interface StarRatingEstimationProvider<
  ModeType extends Mode,
  HitcountsType extends Hitcounts,
> {
  getEstimation(
    score: BeatmapScore<ModeType, HitcountsType>
  ): Promise<number | undefined>;
}
