import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {Mode} from './Mode';

export class ModeTaiko extends Mode {
  readonly ruleset = OsuRuleset.taiko;
  readonly name = 'Taiko';
  readonly shortName = 'taiko';
  readonly validMods = ModAcronym.createMany(...Object.keys(incompatibleMods));
  readonly modApplyOrder = ModAcronym.createMany(
    ...['EZ', 'HR', 'DA'], // Directly modifying stats
    ...['HT', 'DC', 'DT', 'NC'] // Altering game speed
  );
  readonly starRatingChangingMods = ModAcronym.createMany(
    ...['HT', 'DC'], // Difficulty reduction
    ...['DT', 'NC'], // Difficulty increase
    ...['RD'], // Conversion
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
  EZ: ['HR', 'DA'],
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
  AC: ['NF', 'PF', 'CN'],

  // Automation:
  AT: ['CN', 'RX', 'SG', 'AS'],
  CN: ['NF', 'SD', 'PF', 'AC', 'AT', 'RX', 'SG', 'AS'],
  RX: ['AT', 'CN', 'SG'],

  // Conversion:
  RD: ['SW'],
  DA: ['EZ', 'HR'],
  CL: [],
  SW: ['RD'],
  SG: ['AT', 'CN', 'RX'],
  CS: [],

  // Fun:
  WU: ['HT', 'DC', 'DT', 'NC', 'WD', 'AD'],
  WD: ['HT', 'DC', 'DT', 'NC', 'WU', 'AD'],
  MU: [],
  AS: ['HT', 'DC', 'DT', 'NC', 'AT', 'CN', 'WU', 'WD'],
};
