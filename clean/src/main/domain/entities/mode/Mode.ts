import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export abstract class Mode {
  abstract readonly ruleset: OsuRuleset;
  abstract readonly name: string;
  abstract readonly shortName: string;
  abstract readonly validMods: readonly string[];
  abstract readonly modApplyOrder: readonly string[];
  abstract readonly starRatingChangingMods: readonly string[];
  abstract areModsCompatible(a: string, b: string): boolean;
}
