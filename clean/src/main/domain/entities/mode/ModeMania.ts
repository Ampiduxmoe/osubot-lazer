import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Mode} from './Mode';

export class ModeMania extends Mode {
  readonly ruleset = OsuRuleset.mania;
  readonly name = 'Mania';
  readonly shortName = 'mania';
  readonly validMods = [];
  readonly modApplyOrder = [];
  readonly starRatingChangingMods = [];
  areModsCompatible(a: string, b: string): boolean {
    if (a === b) {
      return false;
    }
    return true;
  }
}
