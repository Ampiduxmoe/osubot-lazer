import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeOsu} from '../../mode/ModeOsu';
import {Mod} from '../Mod';

export class Easy extends Mod<ModeOsu, EasySettings> {
  acronym = new ModAcronym('EZ');

  apply(map: Beatmap<ModeOsu>): Beatmap<ModeOsu> {
    return map.copy({
      stats: {
        ar: map.stats.ar / 2,
        cs: map.stats.cs / 2,
        od: map.stats.od / 2,
        hp: map.stats.hp / 2,
      },
    });
  }

  static DefaultSettings: Required<Pick<EasySettings, 'retries'>> = {
    retries: 2,
  };
}

export type EasySettings = {
  retries?: number;
};
