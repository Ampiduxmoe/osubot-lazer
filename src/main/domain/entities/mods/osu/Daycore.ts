import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {BeatmapStatsConversionOsu} from '../../BeatmapStatsConversionOsu';
import {ModeOsu} from '../../mode/ModeOsu';
import {Mod} from '../Mod';

export class Daycore extends Mod<ModeOsu, DaycoreSettings> {
  acronym = new ModAcronym('DC');

  apply(map: Beatmap<ModeOsu>): Beatmap<ModeOsu> {
    const speedChange =
      this.settings.speedChange ?? Daycore.DefaultSettings.speedChange;

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

  static DefaultSettings: Required<DaycoreSettings> = {
    speedChange: 0.75,
  };
}

export type DaycoreSettings = {
  speedChange?: number;
};
