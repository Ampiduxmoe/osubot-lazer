import {ModAcronym} from '../../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {BeatmapStatsConversionOsu} from '../../BeatmapStatsConversionOsu';
import {ModeOsu} from '../../mode/ModeOsu';
import {Mod} from '../Mod';

export class HalfTime extends Mod<ModeOsu, HalfTimeSettings> {
  acronym = new ModAcronym('HT');

  apply(map: Beatmap<ModeOsu>): Beatmap<ModeOsu> {
    const speedChange =
      this.settings.speedChange ?? HalfTime.DefaultSettings.speedChange;

    const oldAr = map.stats.ar;
    const newApproachDuration =
      BeatmapStatsConversionOsu.approachRateToMs(oldAr) / speedChange;
    const newAr =
      BeatmapStatsConversionOsu.msToApproachRate(newApproachDuration);

    const oldOd = map.stats.od;
    const newHitWindowMs =
      BeatmapStatsConversionOsu.overallDifficultyToMs(oldOd) / speedChange;
    const newOd =
      BeatmapStatsConversionOsu.msToOverallDifficulty(newHitWindowMs);
    return map.copy({
      stats: {
        ar: newAr,
        cs: map.stats.cs,
        od: newOd,
        hp: map.stats.hp,
      },
    });
  }

  static DefaultSettings: Required<HalfTimeSettings> = {
    speedChange: 0.75,
    adjustPitch: false,
  };
}

export type HalfTimeSettings = {
  speedChange?: number;
  adjustPitch?: boolean;
};
