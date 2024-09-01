import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeMania} from '../../mode/ModeMania';
import {Mod} from '../Mod';

export class Daycore extends Mod<ModeMania, DaycoreSettings> {
  acronym = new ModAcronym('DC');

  apply(map: Beatmap<ModeMania>): Beatmap<ModeMania> {
    return map;
  }

  static DefaultSettings: Required<DaycoreSettings> = {
    speedChange: 0.75,
  };
}

export type DaycoreSettings = {
  speedChange?: number;
};
