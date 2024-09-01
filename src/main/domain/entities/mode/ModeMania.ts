import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {Mode} from './Mode';

export class ModeMania extends Mode {
  readonly ruleset = OsuRuleset.mania;
  readonly name = 'Mania';
  readonly shortName = 'mania';
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
  NR: ['HO'],

  // Difficulty increase:
  HR: ['EZ', 'DA'],
  SD: ['NF', 'PF', 'CN'],
  PF: ['NF', 'SD', 'AC', 'CN'],
  DT: ['HT', 'DC', 'NC', 'WU', 'WD', 'AS'],
  NC: ['HT', 'DC', 'DT', 'WU', 'WD', 'AS'],
  FI: ['HD', 'CO', 'FL'],
  HD: ['FI', 'CO', 'FL'],
  CO: ['FI', 'HD', 'FL'],
  FL: ['FI', 'HD', 'CO'],
  AC: ['EZ', 'NF', 'PF', 'CN'],

  // Automation:
  AT: ['CN', 'AS'],
  CN: ['NF', 'SD', 'PF', 'AC', 'AT', 'AS'],

  // Conversion:
  RD: [],
  DS: [],
  MR: [],
  DA: ['EZ', 'HR'],
  IN: ['HO'],
  CS: [],
  HO: ['NR', 'IN'],
  // Rename 10K to XK (why should you make an exception for 2-char acronym rule???)
  '1K': ['2K', '3K', '4K', '5K', '6K', '7K', '8K', '9K', 'XK'],
  '2K': ['1K', '3K', '4K', '5K', '6K', '7K', '8K', '9K', 'XK'],
  '3K': ['1K', '2K', '4K', '5K', '6K', '7K', '8K', '9K', 'XK'],
  '4K': ['1K', '2K', '3K', '5K', '6K', '7K', '8K', '9K', 'XK'],
  '5K': ['1K', '2K', '3K', '4K', '6K', '7K', '8K', '9K', 'XK'],
  '6K': ['1K', '2K', '3K', '4K', '5K', '7K', '8K', '9K', 'XK'],
  '7K': ['1K', '2K', '3K', '4K', '5K', '6K', '8K', '9K', 'XK'],
  '8K': ['1K', '2K', '3K', '4K', '5K', '6K', '7K', '9K', 'XK'],
  '9K': ['1K', '2K', '3K', '4K', '5K', '6K', '7K', '8K', 'XK'],
  XK: ['1K', '2K', '3K', '4K', '5K', '6K', '7K', '8K', '9K'],

  // Fun:
  WU: ['HT', 'DC', 'DT', 'NC', 'WD', 'AD'],
  WD: ['HT', 'DC', 'DT', 'NC', 'WU', 'AD'],
  MU: [],
  AS: ['HT', 'DC', 'DT', 'NC', 'AT', 'CN', 'WD', 'WU'],
};
