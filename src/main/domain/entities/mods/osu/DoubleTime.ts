import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {BeatmapStatsConversionOsu} from '../../BeatmapStatsConversionOsu';
import {ModeOsu} from '../../mode/ModeOsu';
import {Mod} from '../Mod';

export class DoubleTime extends Mod<ModeOsu, DoubleTimeSettings> {
  acronym = new ModAcronym('DT');

  apply(map: Beatmap<ModeOsu>): Beatmap<ModeOsu> {
    const speedChange =
      this.settings.speedChange ?? DoubleTime.DefaultSettings.speedChange;

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
      song: map.song.copy({
        bpm: map.song.bpm * speedChange,
        length: map.song.length / speedChange,
      }),
      length: map.length / speedChange,
    });
  }

  static DefaultSettings: Required<DoubleTimeSettings> = {
    speedChange: 1.5,
    adjustPitch: false,
  };
}

export type DoubleTimeSettings = {
  speedChange?: number;
  adjustPitch?: boolean;
};
