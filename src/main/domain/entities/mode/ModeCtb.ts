import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {Mode} from './Mode';

export class ModeCtb extends Mode {
  readonly ruleset = OsuRuleset.ctb;
  readonly name = 'Catch the Beat';
  readonly shortName = 'ctb';
  readonly validMods = ModAcronym.createMany(...Object.keys(incompatibleMods));
  readonly modApplyOrder = ModAcronym.createMany(
    ...['EZ', 'HR', 'DA'], // Directly modifying stats
    ...['HT', 'DC', 'DT', 'NC'] // Altering game speed
  );
  readonly starRatingChangingMods = ModAcronym.createMany(
    ...['EZ', 'HT', 'DC'], // Difficulty reduction
    ...['HR', 'DT', 'NC'], // Difficulty increase
    ...['DA'], // Conversion
    ...['WU', 'WD'] // Fun
  );
  areModsCompatible(a: ModAcronym, b: ModAcronym): boolean {
    if (a.is(b)) {
      return false;
    }
    const incompatibleForA = incompatibleMods[a.toString()];
    if (incompatibleForA === undefined) {
      throw Error(`Unexpected mod ${a}`);
    }
    if (b.isAnyOf(...incompatibleForA)) {
      return false;
    }
    return true;
  }
}

const incompatibleMods: Record<string, string[]> = {
  // Difficulty reduction:
  EZ: ['HR', 'AC', 'DA'],
  NF: ['SD', 'PF', 'AC', 'CN'],
  HT: ['DC', 'DT', 'NC', 'WU', 'WD', 'AS'],
  DC: ['HT', 'DT', 'NC', 'WU', 'WD', 'AS'],

  // Difficulty increase:
  HR: ['EZ', 'DA'],
  SD: ['NF', 'PF', 'CN'],
  PF: ['NF', 'SD', 'AC', 'CN'],
  DT: ['HT', 'DC', 'NC', 'WU', 'WD', 'AS'],
  NC: ['HT', 'DC', 'DT', 'WU', 'WD', 'AS'],
  HD: [],
  FL: [],
  AC: ['EZ', 'NF', 'PF', 'CN'],

  // Automation:
  AT: ['CN', 'RX'],
  CN: ['NF', 'SD', 'PF', 'AC', 'AT', 'RX'],
  RX: ['AT', 'CN'],

  // Conversion:
  DA: ['EZ', 'HR'],
  MR: [],

  // Fun:
  WU: ['HT', 'DC', 'DT', 'NC', 'WD', 'AD'],
  WD: ['HT', 'DC', 'DT', 'NC', 'WU', 'AD'],
  FF: [],
  MU: [],
  NS: [],
};
