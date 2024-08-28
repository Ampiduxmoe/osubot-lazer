import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeCtb} from '../../mode/ModeCtb';
import {Mod} from '../Mod';

export class DifficultyAdjust extends Mod<ModeCtb, DifficultyAdjustSettings> {
  acronym = new ModAcronym('DA');

  apply(map: Beatmap<ModeCtb>): Beatmap<ModeCtb> {
    return map.copy({
      stats: {
        ar: this.settings.ar ?? map.stats.ar,
        cs: this.settings.cs ?? map.stats.cs,
        od: map.stats.od,
        hp: this.settings.hp ?? map.stats.hp,
      },
    });
  }

  static DefaultSettings: (
    map: Beatmap<ModeCtb>
  ) => Required<DifficultyAdjustSettings> = map => ({
    ar: map.stats.ar,
    cs: map.stats.cs,
    hp: map.stats.hp,
    spicyPatterns: false,
  });
}

export type DifficultyAdjustSettings = {
  ar?: number;
  cs?: number;
  hp?: number;
  spicyPatterns?: boolean;
};
