import {BeatmapScore} from './BeatmapScore';
import {HitcountsTaiko} from '../hitcounts/HitcountsTaiko';

export class BeatmapScoreTaiko extends BeatmapScore<HitcountsTaiko> {
  readonly modApplyOrder = [];
  readonly starRatingChangingMods = [];
}
