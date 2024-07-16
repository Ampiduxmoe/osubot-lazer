import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {Mode} from './Mode';

export class ModeMania extends Mode {
  readonly ruleset = OsuRuleset.mania;
  readonly name = 'Mania';
  readonly shortName = 'mania';
  readonly validMods = [];
  readonly modApplyOrder = [];
  readonly starRatingChangingMods = [];
  areModsCompatible(a: ModAcronym, b: ModAcronym): boolean {
    if (a.is(b)) {
      return false;
    }
    return true;
  }
}
