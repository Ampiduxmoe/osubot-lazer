import {BeatmapScore} from '../entities/beatmap_scores/BeatmapScore';
import {Hitcounts} from '../entities/hitcounts/Hitcounts';

export interface StarRatingEstimationProvider<HitcountsType extends Hitcounts> {
  getEstimation(
    score: BeatmapScore<HitcountsType>
  ): Promise<number | undefined>;
}
