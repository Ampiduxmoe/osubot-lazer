import {ModAcronym} from '../../../../../primitives/ModAcronym';
import {Beatmap} from '../../Beatmap';
import {ModeOsu} from '../../mode/ModeOsu';
import {Mod} from '../Mod';

export class TargetPractice extends Mod<ModeOsu, TargetPracticeSettings> {
  acronym = new ModAcronym('TP');

  apply(map: Beatmap<ModeOsu>): Beatmap<ModeOsu> {
    return map.copy({
      stats: {
        ar: map.stats.ar / 2,
        cs: map.stats.cs,
        od: map.stats.od,
        hp: map.stats.hp,
      },
    });
  }

  static DefaultSettings: Required<Pick<TargetPracticeSettings, 'metronome'>> =
    {
      metronome: true,
    };
}

export type TargetPracticeSettings = {
  seed: number;
  metronome?: boolean;
};
