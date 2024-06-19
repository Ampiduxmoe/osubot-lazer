import {Beatmap} from '../Beatmap';
import {Mode} from '../mode/Mode';
import {ModAcronym} from '../../../../primitives/ModAcronym';

export abstract class Mod<
  ModeType extends Mode,
  ModSettingsType extends object,
> {
  abstract readonly acronym: ModAcronym;
  readonly settings: ModSettingsType;
  abstract apply(map: Beatmap<ModeType>): Beatmap<ModeType>;

  constructor(settings: ModSettingsType) {
    this.settings = settings;
  }
}
