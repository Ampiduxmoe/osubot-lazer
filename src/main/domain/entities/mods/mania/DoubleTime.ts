import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeMania} from '../../mode/ModeMania';
import {Mod} from '../Mod';

export class DoubleTime extends Mod<ModeMania, DoubleTimeSettings> {
  acronym = new ModAcronym('DT');

  apply(map: Beatmap<ModeMania>): Beatmap<ModeMania> {
    return map;
  }

  static DefaultSettings: Required<DoubleTimeSettings> = {
    speedChange: 1.5,
    adjustPitch: false,
  };
}

export type DoubleTimeSettings = {
  speedChange?: number;
  adjustPitch?: boolean;
};
