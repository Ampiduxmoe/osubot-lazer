import {ModAcronym} from './ModAcronym';

export class ModCombinationPattern extends Array<ModGroup> {}

export type ModGroup = {
  type: 'required' | 'optional' | 'exclusive' | 'prohibited';
  mods: ModAcronym[];
};
