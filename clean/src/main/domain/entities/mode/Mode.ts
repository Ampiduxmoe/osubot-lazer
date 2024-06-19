import {ModAcronym} from '../../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export abstract class Mode {
  abstract readonly ruleset: OsuRuleset;
  abstract readonly name: string;
  abstract readonly shortName: string;
  abstract readonly validMods: readonly ModAcronym[];
  abstract readonly modApplyOrder: readonly ModAcronym[];
  abstract readonly starRatingChangingMods: readonly ModAcronym[];
  abstract areModsCompatible(a: ModAcronym, b: ModAcronym): boolean;
}
