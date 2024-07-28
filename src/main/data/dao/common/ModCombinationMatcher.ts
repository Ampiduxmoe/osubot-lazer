import {ModAcronym} from '../../../primitives/ModAcronym';

export class ModCombinationMatcher {
  modPattern: {
    acronym: ModAcronym;
    isOptional: boolean;
  }[];
  allFilterMods: ModAcronym[];
  requiredMods: ModAcronym[];
  constructor(
    modPattern: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[]
  ) {
    this.modPattern = modPattern;
    this.allFilterMods = modPattern.map(m => m.acronym);
    this.requiredMods = modPattern
      .filter(m => !m.isOptional)
      .map(m => m.acronym);
  }
  match(mods: ModAcronym[]): boolean {
    if (this.allFilterMods.length === 0) {
      return true;
    }
    if (ModAcronym.listContains('nm', this.requiredMods) && mods.length === 0) {
      return true;
    }
    for (const scoreMod of mods) {
      if (!scoreMod.isAnyOf(...this.allFilterMods)) {
        return false;
      }
    }
    for (const requiredMod of this.requiredMods) {
      if (!requiredMod.isAnyOf(...mods)) {
        return false;
      }
    }
    return true;
  }
}
