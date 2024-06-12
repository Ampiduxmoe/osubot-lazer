import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export abstract class Hitcounts {
  abstract readonly mode: OsuRuleset;
  abstract get orderedValues(): readonly number[];
}
