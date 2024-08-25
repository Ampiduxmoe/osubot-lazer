import {Mode} from '../../../../domain/entities/mode/Mode';
import {Mod, UnremarkableMod} from '../../../../domain/entities/mods/Mod';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuUserRecentScore} from '../../../requirements/dao/OsuUserRecentScoresDao';
import {getModsOsu} from './ModsOsu';
import {getModsTaiko} from './ModsTaiko';

export function getMods(
  score: OsuUserRecentScore,
  ruleset: OsuRuleset
): Mod<Mode, object>[] {
  switch (ruleset) {
    case OsuRuleset.osu:
      return getModsOsu(score);
    case OsuRuleset.taiko:
      return getModsTaiko(score);
    case OsuRuleset.ctb:
      return getModsCtb(score);
    case OsuRuleset.mania:
      return getModsMania(score);
  }
}

function getModsCtb(score: OsuUserRecentScore): Mod<Mode, object>[] {
  return score.mods.map(m => new UnremarkableMod(m.acronym));
}

function getModsMania(score: OsuUserRecentScore): Mod<Mode, object>[] {
  return score.mods.map(m => new UnremarkableMod(m.acronym));
}
