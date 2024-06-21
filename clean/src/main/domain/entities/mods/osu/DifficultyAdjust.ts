import {ModAcronym} from '../../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeOsu} from '../../mode/ModeOsu';
import {Mod} from '../Mod';

export class DifficultyAdjust extends Mod<ModeOsu, DifficultyAdjustSettings> {
  acronym = new ModAcronym('DA');

  apply(map: Beatmap<ModeOsu>): Beatmap<ModeOsu> {
    return map.copy({
      stats: {
        ar: this.settings.ar ?? map.stats.ar,
        cs: this.settings.cs ?? map.stats.cs,
        od: this.settings.od ?? map.stats.od,
        hp: this.settings.hp ?? map.stats.hp,
      },
    });
  }

  static DefaultSettings: (
    map: Beatmap<ModeOsu>
  ) => Required<DifficultyAdjustSettings> = map => ({
    ar: map.stats.ar,
    cs: map.stats.cs,
    od: map.stats.od,
    hp: map.stats.hp,
  });
}

export type DifficultyAdjustSettings = {
  ar?: number;
  cs?: number;
  od?: number;
  hp?: number;
};
