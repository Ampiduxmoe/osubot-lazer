import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeTaiko} from '../../mode/ModeTaiko';
import {Mod} from '../Mod';

export class DifficultyAdjust extends Mod<ModeTaiko, DifficultyAdjustSettings> {
  acronym = new ModAcronym('DA');

  apply(map: Beatmap<ModeTaiko>): Beatmap<ModeTaiko> {
    return map.copy({
      stats: {
        ar: map.stats.ar,
        cs: map.stats.cs,
        od: this.settings.od ?? map.stats.od,
        hp: this.settings.hp ?? map.stats.hp,
      },
    });
  }

  static DefaultSettings: (
    map: Beatmap<ModeTaiko>
  ) => Required<DifficultyAdjustSettings> = map => ({
    od: map.stats.od,
    hp: map.stats.hp,
    scrollSpeed: 1.0,
  });
}

export type DifficultyAdjustSettings = {
  od?: number;
  hp?: number;
  scrollSpeed?: number;
};
