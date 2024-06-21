import {ModAcronym} from '../../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {BeatmapStatsConversionOsu} from '../../BeatmapStatsConversionOsu';
import {ModeOsu} from '../../mode/ModeOsu';
import {Mod} from '../Mod';

export class Nightcore extends Mod<ModeOsu, NightcoreSettings> {
  acronym = new ModAcronym('NC');

  apply(map: Beatmap<ModeOsu>): Beatmap<ModeOsu> {
    const speedChange =
      this.settings.speedChange ?? Nightcore.DefaultSettings.speedChange;

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

  static DefaultSettings: Required<NightcoreSettings> = {
    speedChange: 1.5,
  };
}

export type NightcoreSettings = {
  speedChange?: number;
};
