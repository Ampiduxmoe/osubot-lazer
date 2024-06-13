import {Beatmap} from '../Beatmap';
import {Mode} from '../mode/Mode';

export abstract class Mod<
  ModeType extends Mode,
  ModSettingsType extends object,
> {
  abstract readonly acronym: string;
  readonly settings: ModSettingsType;
  abstract apply(map: Beatmap<ModeType>): Beatmap<ModeType>;

  constructor(settings: ModSettingsType) {
    this.settings = settings;
  }
}
