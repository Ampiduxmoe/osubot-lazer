import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeMania} from '../../mode/ModeMania';
import {Mod} from '../Mod';

export class Easy extends Mod<ModeMania, EasySettings> {
  acronym = new ModAcronym('EZ');

  apply(map: Beatmap<ModeMania>): Beatmap<ModeMania> {
    return map.copy({
      stats: {
        ar: map.stats.ar / 2, // irrelevant but still works
        cs: map.stats.cs / 2, // irrelevant but still works
        od: map.stats.od / 2,
        hp: map.stats.hp / 2,
      },
    });
  }
}

export type EasySettings = {};
