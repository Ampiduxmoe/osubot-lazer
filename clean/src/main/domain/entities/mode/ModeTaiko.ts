import {ModAcronym} from '../../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Mode} from './Mode';

export class ModeTaiko extends Mode {
  readonly ruleset = OsuRuleset.taiko;
  readonly name = 'Taiko';
  readonly shortName = 'taiko';
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
