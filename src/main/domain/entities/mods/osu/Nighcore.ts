import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {BeatmapStatsConversion} from '../../BeatmapStatsConversion';
import {ModeOsu} from '../../mode/ModeOsu';
import {Mod} from '../Mod';

export class Nightcore extends Mod<ModeOsu, NightcoreSettings> {
  acronym = new ModAcronym('NC');

  apply(map: Beatmap<ModeOsu>): Beatmap<ModeOsu> {
    const speedChange =
      this.settings.speedChange ?? Nightcore.DefaultSettings.speedChange;

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

  static DefaultSettings: Required<NightcoreSettings> = {
    speedChange: 1.5,
  };
}

export type NightcoreSettings = {
  speedChange?: number;
};
