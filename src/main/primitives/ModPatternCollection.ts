import {ModAcronym} from './ModAcronym';
import {ModCombinationPattern} from './ModCombinationPattern';

export class ModPatternCollection extends Array<ModCombinationPattern> {
  isInverted = false;

  applyInverted(value: boolean): ModPatternCollection {
    this.isInverted = value;
    return this;
  }

  get allMods(): ModAcronym[] {
    return this.map(p => p.allMods).flat();
  }

  allowLegacy(): ModPatternCollection {
    if (this.length === 0) {
      return this;
    }
    if (
      this.length === 1 &&
      this[0].length === 1 &&
      this[0][0].mods.length === 1 &&
      this[0][0].mods[0].is('NM')
    ) {
      // +NM and -NM become +NM,CL and -NM,CL
      this.push(
        new ModCombinationPattern({
          mods: [new ModAcronym('CL')],
          type: 'required',
        })
      );
      return this;
    }
    for (const pattern of this) {
      if (
        pattern.requiredGroups.length > 0 ||
        pattern.exclusiveGroups.length > 0
      ) {
        // any pattern that requires a mod now allows CL
        pattern.push({
          mods: [new ModAcronym('CL')],
          type: 'optional',
        });
      }
    }
    return this;
  }

  treatAsInterchangeable(mod1: string, mod2: string): ModPatternCollection {
    if (this.length === 0) {
      return this;
    }
    const allMods = this.allMods;
    if (
      !ModAcronym.listContains(mod1, allMods) &&
      !ModAcronym.listContains(mod2, allMods)
    ) {
      return this;
    }
    (() => {
      // first pass is to adjust required and prohibied groups
      const allPatterns = [...this];
      for (const pattern of allPatterns) {
        const allGroups = [...pattern];
        for (const group of allGroups) {
          if (
            !ModAcronym.listContains(mod1, group.mods) &&
            !ModAcronym.listContains(mod2, group.mods)
          ) {
            continue;
          }
          // we have at least one of specified mods in the group
          if (group.type === 'required') {
            // if mod1 is DT and mod2 is NC
            // then +HDDT should become +HD[DTNC]
            group.mods = group.mods.filter(m => !m.isAnyOf(mod1, mod2));
            pattern.push({
              mods: ModAcronym.createMany(mod1, mod2),
              type: 'exclusive',
            });
          }
          if (group.type === 'prohibited') {
            // +{DT} should become +{DTNC}
            group.mods = group.mods.filter(m => !m.isAnyOf(mod1, mod2));
            group.mods.push(...ModAcronym.createMany(mod1, mod2));
          }
        }
      }
    })();
    (() => {
      // second pass is to create mirrored versions of patterns
      // that have specified mods in their optional groups
      const allPatterns = [...this];
      for (const pattern of allPatterns) {
        const optionalMods = pattern.optionalGroups.map(g => g.mods).flat();
        if (
          ModAcronym.listContains(mod1, optionalMods) ||
          ModAcronym.listContains(mod2, optionalMods)
        ) {
          let hasChanges = false;
          const newPattern = new ModCombinationPattern(
            ...pattern.map(group => {
              if (group.type !== 'optional') {
                return group;
              }
              if (
                ModAcronym.listContains(mod1, group.mods) &&
                ModAcronym.listContains(mod2, group.mods)
              ) {
                // i don't think there is a way
                // to change the Pattern Collection
                // that will make sense in this case
                return group;
              }
              hasChanges = true;
              return {
                mods: group.mods.map(m => {
                  if (m.is(mod1)) {
                    return new ModAcronym(mod2);
                  }
                  if (m.is(mod2)) {
                    return new ModAcronym(mod1);
                  }
                  return m;
                }),
                type: group.type,
              };
            })
          );
          if (hasChanges) {
            this.push(newPattern);
          }
        }
      }
    })();
    (() => {
      // third pass is to create mirrored versions of patterns
      // that have specified mods in their exclusive groups
      const allPatterns = [...this];
      for (const pattern of allPatterns) {
        const optionalMods = pattern.optionalGroups.map(g => g.mods).flat();
        if (
          ModAcronym.listContains(mod1, optionalMods) ||
          ModAcronym.listContains(mod2, optionalMods)
        ) {
          let hasChanges = false;
          const newPattern = new ModCombinationPattern(
            ...pattern.map(group => {
              if (group.type !== 'exclusive') {
                return group;
              }
              if (
                ModAcronym.listContains(mod1, group.mods) &&
                ModAcronym.listContains(mod2, group.mods)
              ) {
                // i don't think there is a way
                // to change the Pattern Collection
                // that will make sense in this case
                return group;
              }
              hasChanges = true;
              return {
                mods: group.mods.map(m => {
                  if (m.is(mod1)) {
                    return new ModAcronym(mod2);
                  }
                  if (m.is(mod2)) {
                    return new ModAcronym(mod1);
                  }
                  return m;
                }),
                type: group.type,
              };
            })
          );
          if (hasChanges) {
            this.push(newPattern);
          }
        }
      }
    })();
    return this;
  }

  deepCopy(): ModPatternCollection {
    return new ModPatternCollection(
      ...this.map(pattern => pattern.deepCopy())
    ).applyInverted(this.isInverted);
  }
}
