import {BeatmapScore} from './BeatmapScore';
import {HitcountsCtb} from '../hitcounts/HitcountsCtb';

export class BeatmapScoreCtb extends BeatmapScore<HitcountsCtb> {
  readonly modApplyOrder = [];
  readonly starRatingChangingMods = [];
}
