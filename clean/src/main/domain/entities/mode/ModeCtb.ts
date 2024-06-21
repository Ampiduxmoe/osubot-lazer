import {ModAcronym} from '../../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Mode} from './Mode';

export class ModeCtb extends Mode {
  readonly ruleset = OsuRuleset.ctb;
  readonly name = 'Catch the beat';
  readonly shortName = 'ctb';
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
