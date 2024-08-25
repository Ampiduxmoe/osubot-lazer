import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {BeatmapStatsConversion} from '../../BeatmapStatsConversion';
import {ModeTaiko} from '../../mode/ModeTaiko';
import {Mod} from '../Mod';

export class Nightcore extends Mod<ModeTaiko, NightcoreSettings> {
  acronym = new ModAcronym('NC');

  apply(map: Beatmap<ModeTaiko>): Beatmap<ModeTaiko> {
    const speedChange =
      this.settings.speedChange ?? Nightcore.DefaultSettings.speedChange;

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

  static DefaultSettings: Required<NightcoreSettings> = {
    speedChange: 1.5,
  };
}

export type NightcoreSettings = {
  speedChange?: number;
};
