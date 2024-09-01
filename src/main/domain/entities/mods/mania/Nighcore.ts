import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeMania} from '../../mode/ModeMania';
import {Mod} from '../Mod';

export class Nightcore extends Mod<ModeMania, NightcoreSettings> {
  acronym = new ModAcronym('NC');

  apply(map: Beatmap<ModeMania>): Beatmap<ModeMania> {
    return map;
  }

  static DefaultSettings: Required<NightcoreSettings> = {
    speedChange: 1.5,
  };
}

export type NightcoreSettings = {
  speedChange?: number;
};
