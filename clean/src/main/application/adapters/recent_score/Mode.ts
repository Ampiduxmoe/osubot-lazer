import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Mode} from '../../../domain/entities/mode/Mode';
import {ModeCtb} from '../../../domain/entities/mode/ModeCtb';
import {ModeMania} from '../../../domain/entities/mode/ModeMania';
import {ModeOsu} from '../../../domain/entities/mode/ModeOsu';
import {ModeTaiko} from '../../../domain/entities/mode/ModeTaiko';

export function getMode(ruleset: OsuRuleset): Mode {
  switch (ruleset) {
    case OsuRuleset.osu:
      return new ModeOsu();
    case OsuRuleset.taiko:
      return new ModeTaiko();
    case OsuRuleset.ctb:
      return new ModeCtb();
    case OsuRuleset.mania:
      return new ModeMania();
  }
}
