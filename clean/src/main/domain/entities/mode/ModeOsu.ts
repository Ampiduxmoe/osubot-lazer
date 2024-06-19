import {ModAcronym} from '../../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Mode} from './Mode';

export class ModeOsu extends Mode {
  readonly ruleset = OsuRuleset.osu;
  readonly name = 'osu!';
  readonly shortName = 'osu';
  readonly validMods = [];
  readonly modApplyOrder = ModAcronym.createMany(
    ...['EZ', 'HR', 'DA'],
    ...['TP'],
    ...['HT', 'DC', 'DT', 'NC']
  );
  readonly starRatingChangingMods = ModAcronym.createMany(
    'EZ', // Easy
    'HT', // Half Time
    'DC', // Daycore
    'HR', // Hard Rock
    'DT', // Double Time
    'NC', // Nightcore
    'FL', // Flashlight
    'RX', // Relax
    'TP', // Target Practice
    'DA', // Difficulty Adjust
    'RD', // Random
    'WU', // Wind Up
    'WD' // Wind Down
  );
  areModsCompatible(a: ModAcronym, b: ModAcronym): boolean {
    if (a === b) {
      return false;
    }
    return true;
  }
}
