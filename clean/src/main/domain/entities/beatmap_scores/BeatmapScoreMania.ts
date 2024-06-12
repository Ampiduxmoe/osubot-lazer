import {BeatmapScore} from './BeatmapScore';
import {HitcountsMania} from '../hitcounts/HitcountsMania';

export class BeatmapScoreMania extends BeatmapScore<HitcountsMania> {
  readonly modApplyOrder = [];
  readonly starRatingChangingMods = [];
}
