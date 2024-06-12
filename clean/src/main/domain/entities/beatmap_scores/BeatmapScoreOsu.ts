import {BeatmapScore} from './BeatmapScore';
import {HitcountsOsu} from '../hitcounts/HitcountsOsu';

export class BeatmapScoreOsu extends BeatmapScore<HitcountsOsu> {
  readonly modApplyOrder = [
    ...['EZ', 'HR', 'DA'],
    ...['TP'],
    ...['HT', 'DC', 'DT', 'NC'],
  ];
  readonly starRatingChangingMods = [
    'EZ', // Easy
    'HT', // Half Time
    'DC', // Daycore
    'HR', // Hard Rock
    'DT', // Double Time
    'NC', // Nightcore
    'FL', // Flashlight
    'RX', // Relax
    'TP', // Target Practice
    'DA', // Difficulty Adjust
    'RD', // Random
    'WU', // Wind Up
    'WD', // Wind Down
  ];
}
