import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Beatmap} from '../Beatmap';

export abstract class Mod<ModSettingsType extends object> {
  abstract readonly mode: OsuRuleset;
  abstract readonly acronym: string;
  readonly settings: ModSettingsType;
  abstract apply(map: Beatmap): Beatmap;

  constructor(settings: ModSettingsType) {
    this.settings = settings;
  }
}
