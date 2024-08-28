import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeCtb} from '../../mode/ModeCtb';
import {Mod} from '../Mod';

export class Easy extends Mod<ModeCtb, EasySettings> {
  acronym = new ModAcronym('EZ');

  apply(map: Beatmap<ModeCtb>): Beatmap<ModeCtb> {
    return map.copy({
      stats: {
        ar: map.stats.ar / 2,
        cs: map.stats.cs / 2,
        od: map.stats.od / 2, // irrelevant but still works
        hp: map.stats.hp / 2,
      },
    });
  }
}

export type EasySettings = {};
