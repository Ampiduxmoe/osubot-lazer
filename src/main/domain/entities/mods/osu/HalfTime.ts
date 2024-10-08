import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {BeatmapStatsConversion} from '../../BeatmapStatsConversion';
import {ModeOsu} from '../../mode/ModeOsu';
import {Mod} from '../Mod';

export class HalfTime extends Mod<ModeOsu, HalfTimeSettings> {
  acronym = new ModAcronym('HT');

  apply(map: Beatmap<ModeOsu>): Beatmap<ModeOsu> {
    const speedChange =
      this.settings.speedChange ?? HalfTime.DefaultSettings.speedChange;

    const oldAr = map.stats.ar;
    const newApproachDuration =
      BeatmapStatsConversion.osu.approachRateToMs(oldAr) / speedChange;
    const newAr =
      BeatmapStatsConversion.osu.msToApproachRate(newApproachDuration);

    const oldOd = map.stats.od;
    const newHitWindowMs =
      BeatmapStatsConversion.osu.overallDifficultyToMs(oldOd) / speedChange;
    const newOd =
      BeatmapStatsConversion.osu.msToOverallDifficulty(newHitWindowMs);
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

  static DefaultSettings: Required<HalfTimeSettings> = {
    speedChange: 0.75,
    adjustPitch: false,
  };
}

export type HalfTimeSettings = {
  speedChange?: number;
  adjustPitch?: boolean;
};
