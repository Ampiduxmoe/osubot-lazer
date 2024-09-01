import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeMania} from '../../mode/ModeMania';
import {Mod} from '../Mod';

export class HardRock extends Mod<ModeMania, HardRockSettings> {
  acronym = new ModAcronym('HR');

  apply(map: Beatmap<ModeMania>): Beatmap<ModeMania> {
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
