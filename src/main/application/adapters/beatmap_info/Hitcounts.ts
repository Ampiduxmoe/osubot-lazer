import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {Hitcounts} from '../../../domain/entities/hitcounts/Hitcounts';
import {HitcountsCtb} from '../../../domain/entities/hitcounts/HitcountsCtb';
import {HitcountsMania} from '../../../domain/entities/hitcounts/HitcountsMania';
import {HitcountsOsu} from '../../../domain/entities/hitcounts/HitcountsOsu';
import {HitcountsTaiko} from '../../../domain/entities/hitcounts/HitcountsTaiko';

export function getHitcounts(ruleset: OsuRuleset): Hitcounts {
  switch (ruleset) {
    case OsuRuleset.osu:
      return new HitcountsOsu({});
    case OsuRuleset.taiko:
      return new HitcountsTaiko({});
    case OsuRuleset.ctb:
      return new HitcountsCtb({});
    case OsuRuleset.mania:
      return new HitcountsMania({});
  }
}
