import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Hitcounts} from '../../../domain/entities/hitcounts/Hitcounts';
import {HitcountsCtb} from '../../../domain/entities/hitcounts/HitcountsCtb';
import {HitcountsMania} from '../../../domain/entities/hitcounts/HitcountsMania';
import {HitcountsOsu} from '../../../domain/entities/hitcounts/HitcountsOsu';
import {HitcountsTaiko} from '../../../domain/entities/hitcounts/HitcountsTaiko';
import {OsuUserRecentScore} from '../../requirements/dao/OsuUserRecentScoresDao';

export function getHitcounts(
  score: OsuUserRecentScore,
  ruleset: OsuRuleset
): Hitcounts {
  switch (ruleset) {
    case OsuRuleset.osu:
      return getHitcountsOsu(score);
    case OsuRuleset.taiko:
      return getHitcountsTaiko(score);
    case OsuRuleset.ctb:
      return getHitcountsCtb(score);
    case OsuRuleset.mania:
      return getHitcountsMania(score);
  }
}

function getHitcountsOsu(score: OsuUserRecentScore): HitcountsOsu {
  return new HitcountsOsu({
    great: score.statistics.great,
    ok: score.statistics.ok,
    meh: score.statistics.meh,
    miss: score.statistics.miss,
  });
}

function getHitcountsTaiko(score: OsuUserRecentScore): HitcountsTaiko {
  return new HitcountsTaiko({
    great: score.statistics.great,
    ok: score.statistics.ok,
    miss: score.statistics.miss,
  });
}

function getHitcountsCtb(score: OsuUserRecentScore): HitcountsCtb {
  return new HitcountsCtb({
    great: score.statistics.great,
    largeTickHit: score.statistics.largeTickHit,
    smallTickHit: score.statistics.smallTickHit,
    smallTickMiss: score.statistics.smallTickMiss,
    miss: score.statistics.miss,
  });
}

function getHitcountsMania(score: OsuUserRecentScore): HitcountsMania {
  return new HitcountsMania({
    perfect: score.statistics.perfect,
    great: score.statistics.great,
    good: score.statistics.good,
    ok: score.statistics.ok,
    meh: score.statistics.meh,
    miss: score.statistics.miss,
  });
}
