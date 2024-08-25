import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {BeatmapStatsConversion} from '../../BeatmapStatsConversion';
import {ModeTaiko} from '../../mode/ModeTaiko';
import {Mod} from '../Mod';

export class HalfTime extends Mod<ModeTaiko, HalfTimeSettings> {
  acronym = new ModAcronym('HT');

  apply(map: Beatmap<ModeTaiko>): Beatmap<ModeTaiko> {
    const speedChange =
      this.settings.speedChange ?? HalfTime.DefaultSettings.speedChange;

    const oldOd = map.stats.od;
    const newHitWindowMs =
      BeatmapStatsConversion.taiko.overallDifficultyToMs(oldOd) / speedChange;
    const newOd =
      BeatmapStatsConversion.taiko.msToOverallDifficulty(newHitWindowMs);
    return map.copy({
      stats: {
        ar: map.stats.ar,
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

  static DefaultSettings: Required<HalfTimeSettings> = {
    speedChange: 0.75,
    adjustPitch: false,
  };
}

export type HalfTimeSettings = {
  speedChange?: number;
  adjustPitch?: boolean;
};
