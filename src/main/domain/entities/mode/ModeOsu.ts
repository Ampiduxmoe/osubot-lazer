import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {Mode} from './Mode';

export class ModeOsu extends Mode {
  readonly ruleset = OsuRuleset.osu;
  readonly name = 'osu!';
  readonly shortName = 'osu';
  readonly validMods = ModAcronym.createMany(...Object.keys(incompatibleMods));
  readonly modApplyOrder = ModAcronym.createMany(
    ...['EZ', 'HR', 'DA'], // Directly modifying stats
    ...['TP'], // Special
    ...['HT', 'DC', 'DT', 'NC'] // Altering game speed
  );
  readonly starRatingChangingMods = ModAcronym.createMany(
    ...['EZ', 'HT', 'DC'], // Difficulty reduction
    ...['HR', 'DT', 'NC', 'FL'], // Difficulty increase
    ...['RX'], // Automation
    ...['TP', 'DA', 'RD'], // Conversion
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
  HR: ['EZ', 'DA', 'MR'],
  SD: ['NF', 'PF', 'CN', 'TP'],
  PF: ['NF', 'SD', 'AC', 'CN'],
  DT: ['HT', 'DC', 'NC', 'WU', 'WD', 'AS'],
  NC: ['HT', 'DC', 'DT', 'WU', 'WD', 'AS'],
  HD: ['SI', 'TC', 'AD', 'DP'],
  FL: ['BL'],
  BL: ['FL'],
  ST: ['TP', 'CL'],
  AC: ['EZ', 'NF', 'PF', 'CN'],

  // Automation:
  AT: ['CN', 'RX', 'AP', 'SO', 'AL', 'SG', 'MG', 'RP', 'AS'],
  CN: ['NF', 'SD', 'PF', 'AC', 'RX', 'AP', 'SO', 'AL', 'SG', 'MG', 'RP', 'AS'],
  RX: ['AT', 'CN', 'AP', 'AL', 'SG', 'MG'],
  AP: ['AT', 'CN', 'RX', 'SO', 'MG', 'RP'],
  SO: ['AT', 'CN', 'AP', 'TP'],

  // Conversion:
  TP: ['SD', 'ST', 'SO', 'RD', 'TC', 'AD', 'DP'],
  DA: ['EZ', 'HR'],
  CL: ['ST'],
  RD: ['TP'],
  MR: ['HR'],
  AL: ['AT', 'CN', 'RX', 'SG'],
  SG: ['AT', 'CN', 'RX', 'AL'],

  // Fun:
  TR: ['WG', 'MG', 'RP', 'FR', 'DP'],
  WG: ['TR', 'MG', 'RP', 'DP'],
  SI: ['HD', 'GR', 'DF', 'TC', 'AD', 'DP'],
  GR: ['SI', 'DF', 'TC', 'AD', 'DP'],
  DF: ['SI', 'GR', 'TC', 'AD', 'DP'],
  WU: ['HT', 'DC', 'DT', 'NC', 'WD', 'AD'],
  WD: ['HT', 'DC', 'DT', 'NC', 'WU', 'AD'],
  TC: ['HD', 'TP', 'SI', 'GR', 'DF', 'DP'],
  BR: ['BU'],
  AD: ['HD', 'TP', 'SI', 'GR', 'DF', 'FR'],
  MU: [],
  NS: [],
  MG: ['AT', 'CN', 'RX', 'AP', 'TR', 'WG', 'RP', 'BU', 'DP'],
  RP: ['AT', 'CN', 'AP', 'TR', 'WG', 'MG', 'BU', 'DP'],
  AS: ['HT', 'DC', 'DT', 'NC', 'AT', 'CN', 'WU', 'WD'],
  FR: ['TR', 'AD', 'DP'],
  BU: ['BR', 'MG', 'RP'],
  SY: [],
  DP: ['HD', 'TP', 'TR', 'WG', 'SI', 'GR', 'DF', 'TC', 'MG', 'RP', 'FR'],
};
