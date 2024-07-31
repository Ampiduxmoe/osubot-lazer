import {ModAcronym} from './ModAcronym';

export class ModCombinationPattern extends Array<ModGroup> {
  isInverted = false;

  applyInverted(value: boolean): ModCombinationPattern {
    this.isInverted = value;
    return this;
  }

  get requiredGroups(): ModGroup[] {
    return this.filter(g => g.type === 'required');
  }

  get optionalGroups(): ModGroup[] {
    return this.filter(g => g.type === 'optional');
  }

  get exclusiveGroups(): ModGroup[] {
    return this.filter(g => g.type === 'exclusive');
  }

  get prohibitedGroups(): ModGroup[] {
    return this.filter(g => g.type === 'prohibited');
  }

  get allMods(): ModAcronym[] {
    return this.map(g => g.mods).flat();
  }

  deepCopy(): ModCombinationPattern {
    return new ModCombinationPattern(
      ...this.map(group => ({
        type: group.type,
        mods: [...group.mods],
      }))
    ).applyInverted(this.isInverted);
  }
}

export type ModGroup = {
  type: 'required' | 'optional' | 'exclusive' | 'prohibited';
  mods: ModAcronym[];
};
