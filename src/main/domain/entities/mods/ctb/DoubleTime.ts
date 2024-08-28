import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {BeatmapStatsConversion} from '../../BeatmapStatsConversion';
import {ModeCtb} from '../../mode/ModeCtb';
import {Mod} from '../Mod';

export class DoubleTime extends Mod<ModeCtb, DoubleTimeSettings> {
  acronym = new ModAcronym('DT');

  apply(map: Beatmap<ModeCtb>): Beatmap<ModeCtb> {
    const speedChange =
      this.settings.speedChange ?? DoubleTime.DefaultSettings.speedChange;

    const oldAr = map.stats.ar;
    const newApproachDuration =
      BeatmapStatsConversion.ctb.approachRateToMs(oldAr) / speedChange;
    const newAr =
      BeatmapStatsConversion.ctb.msToApproachRate(newApproachDuration);
    return map.copy({
      stats: {
        ar: newAr,
        cs: map.stats.cs,
        od: map.stats.od,
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
