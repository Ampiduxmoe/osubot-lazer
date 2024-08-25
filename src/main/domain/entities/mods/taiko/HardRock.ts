import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeTaiko} from '../../mode/ModeTaiko';
import {Mod} from '../Mod';

export class HardRock extends Mod<ModeTaiko, HardRockSettings> {
  acronym = new ModAcronym('HR');

  apply(map: Beatmap<ModeTaiko>): Beatmap<ModeTaiko> {
    return map.copy({
      stats: {
        ar: map.stats.ar,
        cs: map.stats.cs,
        od: Math.min(map.stats.od * 1.4, 10),
        hp: Math.min(map.stats.hp * 1.4, 10),
      },
    });
  }
}

export type HardRockSettings = {};
