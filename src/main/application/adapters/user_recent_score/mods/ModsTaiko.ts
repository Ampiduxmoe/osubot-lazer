import {ModeTaiko} from '../../../../domain/entities/mode/ModeTaiko';
import {Mod, UnremarkableMod} from '../../../../domain/entities/mods/Mod';
import {Daycore} from '../../../../domain/entities/mods/taiko/Daycore';
import {DifficultyAdjust} from '../../../../domain/entities/mods/taiko/DifficultyAdjust';
import {DoubleTime} from '../../../../domain/entities/mods/taiko/DoubleTime';
import {Easy} from '../../../../domain/entities/mods/taiko/Easy';
import {HalfTime} from '../../../../domain/entities/mods/taiko/HalfTime';
import {HardRock} from '../../../../domain/entities/mods/taiko/HardRock';
import {Nightcore} from '../../../../domain/entities/mods/taiko/Nighcore';
import {OsuUserRecentScore} from '../../../requirements/dao/OsuUserRecentScoresDao';

export function getModsTaiko(
  score: OsuUserRecentScore
): (Mod<ModeTaiko, object> | UnremarkableMod)[] {
  return score.mods.map(m => {
    if (m.acronym.is('DA')) {
      return new DifficultyAdjust({
        od: m.settings?.od,
        hp: m.settings?.hp,
      });
    }
    if (m.acronym.is('EZ')) {
      return new Easy({});
    }
    if (m.acronym.is('HR')) {
      return new HardRock({});
    }
    if (m.acronym.is('HT')) {
      return new HalfTime({
        speedChange: m.settings?.speedChange,
        adjustPitch: m.settings?.adjustPitch,
      });
    }
    if (m.acronym.is('DC')) {
      return new Daycore({speedChange: m.settings?.speedChange});
    }
    if (m.acronym.is('DT')) {
      return new DoubleTime({
        speedChange: m.settings?.speedChange,
        adjustPitch: m.settings?.adjustPitch,
      });
    }
    if (m.acronym.is('NC')) {
      return new Nightcore({speedChange: m.settings?.speedChange});
    }
    return new UnremarkableMod(m.acronym);
  });
}
