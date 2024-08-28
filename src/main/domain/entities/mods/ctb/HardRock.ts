import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeCtb} from '../../mode/ModeCtb';
import {Mod} from '../Mod';

export class HardRock extends Mod<ModeCtb, HardRockSettings> {
  acronym = new ModAcronym('HR');

  apply(map: Beatmap<ModeCtb>): Beatmap<ModeCtb> {
    return map.copy({
      stats: {
        ar: Math.min(map.stats.ar * 1.4, 10),
        cs: Math.min(map.stats.cs * 1.3, 10),
        od: Math.min(map.stats.od * 1.4, 10), // irrelevant but still works
        hp: Math.min(map.stats.hp * 1.4, 10),
      },
    });
  }
}

export type HardRockSettings = {};
