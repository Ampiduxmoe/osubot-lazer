import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Mode} from './Mode';

export class ModeTaiko extends Mode {
  readonly ruleset = OsuRuleset.taiko;
  readonly name = 'Taiko';
  readonly shortName = 'taiko';
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
