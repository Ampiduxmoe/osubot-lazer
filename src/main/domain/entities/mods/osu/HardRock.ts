import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeOsu} from '../../mode/ModeOsu';
import {Mod} from '../Mod';

export class HardRock extends Mod<ModeOsu, HardRockSettings> {
  acronym = new ModAcronym('HR');

  apply(map: Beatmap<ModeOsu>): Beatmap<ModeOsu> {
    return map.copy({
      stats: {
        ar: Math.min(map.stats.ar * 1.4, 10),
        cs: Math.min(map.stats.cs * 1.3, 10),
        od: Math.min(map.stats.od * 1.4, 10),
        hp: Math.min(map.stats.hp * 1.4, 10),
      },
    });
  }
}

export type HardRockSettings = {};
