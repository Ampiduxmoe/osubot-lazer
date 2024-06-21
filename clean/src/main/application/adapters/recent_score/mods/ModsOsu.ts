import {ModeOsu} from '../../../../domain/entities/mode/ModeOsu';
import {Mod, UnremarkableMod} from '../../../../domain/entities/mods/Mod';
import {Daycore} from '../../../../domain/entities/mods/osu/Daycore';
import {DifficultyAdjust} from '../../../../domain/entities/mods/osu/DifficultyAdjust';
import {DoubleTime} from '../../../../domain/entities/mods/osu/DoubleTime';
import {Easy} from '../../../../domain/entities/mods/osu/Easy';
import {HalfTime} from '../../../../domain/entities/mods/osu/HalfTime';
import {HardRock} from '../../../../domain/entities/mods/osu/HardRock';
import {Nightcore} from '../../../../domain/entities/mods/osu/Nighcore';
import {TargetPractice} from '../../../../domain/entities/mods/osu/TargetPractice';
import {RecentScore} from '../../../requirements/dao/OsuRecentScoresDao';

export function getModsOsu(
  score: RecentScore
): (Mod<ModeOsu, object> | UnremarkableMod)[] {
  return score.mods.map(m => {
    if (m.acronym.is('DA')) {
      return new DifficultyAdjust({
        ar: m.settings?.ar,
        cs: m.settings?.cs,
        od: m.settings?.od,
        hp: m.settings?.hp,
      });
    }
    if (m.acronym.is('EZ')) {
      return new Easy({
        retries: m.settings?.retries,
      });
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
    if (m.acronym.is('TP')) {
      return new TargetPractice({
        seed:
          m.settings?.seed ??
          (() => {
            throw Error('Seed should be provided');
          })(),
        metronome: m.settings?.metronome,
      });
    }
    return new UnremarkableMod(m.acronym);
  });
}
