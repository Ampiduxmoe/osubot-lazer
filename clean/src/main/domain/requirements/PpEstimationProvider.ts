import {BeatmapScore} from '../beatmap_scores/BeatmapScore';
import {Hitcounts} from '../hitcounts/Hitcounts';

export interface PpEstimationProvider<HitcountsType extends Hitcounts> {
  getEstimation(
    score: BeatmapScore<HitcountsType>
  ): Promise<number | undefined>;
}
