import {ModAcronym} from '../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeMania} from '../../mode/ModeMania';
import {Mod} from '../Mod';

export class HalfTime extends Mod<ModeMania, HalfTimeSettings> {
  acronym = new ModAcronym('HT');

  apply(map: Beatmap<ModeMania>): Beatmap<ModeMania> {
    return map;
  }

  static DefaultSettings: Required<HalfTimeSettings> = {
    speedChange: 0.75,
    adjustPitch: false,
  };
}

export type HalfTimeSettings = {
  speedChange?: number;
  adjustPitch?: boolean;
};
