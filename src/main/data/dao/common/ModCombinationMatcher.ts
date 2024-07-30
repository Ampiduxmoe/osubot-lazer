import {createUniquesFilter} from '../../../primitives/Arrays';
import {ModAcronym} from '../../../primitives/ModAcronym';
import {
  ModCombinationPattern,
  ModGroup,
} from '../../../primitives/ModCombinationPattern';

export class ModCombinationMatcher {
  originalPattern: ModCombinationPattern;
  normalizedPattern: ModCombinationPattern;
  earlyReturnValue: boolean | undefined;
  constructor(modPattern: ModCombinationPattern) {
    this.originalPattern = modPattern;
    const uniqueModsFilter = createUniquesFilter<ModAcronym>((a, b) => a.is(b));
    const prohibitedGroup: ModGroup = {
      // merge all prohibited groups into one and delete duplicates
      mods: modPattern
        .filter(group => group.type === 'prohibited')
        .map(group => group.mods)
        .flat()
        .filter(uniqueModsFilter),
      type: 'prohibited',
    };
    const requiredGroup: ModGroup = {
      // merge all required groups into one and delete duplicates
      mods: modPattern
        .filter(group => group.type === 'required')
        .map(group => group.mods)
        .flat()
        .concat(
          // add all exclusive groups of length 1 since they behave like required mods
          modPattern
            .filter(g => g.type === 'exclusive')
            .map(g =>
              g.mods
                .filter(uniqueModsFilter)
                .filter(
                  m =>
                    !ModAcronym.listContains(m.toString(), prohibitedGroup.mods)
                )
            )
            .filter(g => g.length === 1)
            .flat()
        )
        .filter(uniqueModsFilter),
      type: 'required',
    };
    const optionalGroups: ModGroup[] = modPattern
      .filter(g => g.type === 'optional')
      .map(g => ({
        mods: g.mods.filter(uniqueModsFilter),
        type: 'optional' as const,
      }))
      .filter(
        // ignore optional groups that contain prohibited mod
        g =>
          g.mods.find(m =>
            ModAcronym.listContains(m.toString(), prohibitedGroup.mods)
          ) === undefined
      );
    const exclusiveGroups: ModGroup[] = modPattern
      .filter(g => g.type === 'exclusive')
      .map(g => ({
        mods: g.mods.filter(uniqueModsFilter).filter(
          // ignore exclusive mods that are prohibited since they should not be selected anyway
          m => !ModAcronym.listContains(m.toString(), prohibitedGroup.mods)
        ),
        type: 'exclusive' as const,
      }))
      .filter(g => g.mods.length > 1);
    this.normalizedPattern = new ModCombinationPattern(
      ...(requiredGroup.mods.length > 0 ? [requiredGroup] : []),
      ...optionalGroups,
      ...exclusiveGroups,
      ...(prohibitedGroup.mods.length > 0 ? [prohibitedGroup] : [])
    );
    if (this.normalizedPattern.length === 0) {
      // no restrictions = everything is valid
      this.earlyReturnValue = true;
    }
    if (optionalGroups.length === this.normalizedPattern.length) {
      // has only optional groups, any mod combination will match this pattern
      this.earlyReturnValue = true;
    }
    if (
      requiredGroup.mods.find(m =>
        ModAcronym.listContains(m.toString(), prohibitedGroup.mods)
      ) !== undefined
    ) {
      // if mod is present in both required and prohibited group it is impossible condition
      this.earlyReturnValue = false;
    }
    if (
      this.earlyReturnValue !== undefined &&
      this.originalPattern.isInverted
    ) {
      this.earlyReturnValue = !this.earlyReturnValue;
    }
  }
  match(mods: ModAcronym[]): boolean {
    if (this.earlyReturnValue !== undefined) {
      return this.earlyReturnValue;
    }
    const directResult = this.directMatch(mods);
    if (this.originalPattern.isInverted) {
      return !directResult;
    }
    return directResult;
  }
  directMatch(mods: ModAcronym[]): boolean {
    const shouldCheckForPossibleMods =
      this.normalizedPattern.filter(g =>
        ['required', 'exclusive'].includes(g.type)
      ).length > 0;
    const possibleMods = this.normalizedPattern
      .filter(g => ['required', 'optional', 'exclusive'].includes(g.type))
      .map(g => g.mods)
      .flat();
    if (
      shouldCheckForPossibleMods &&
      mods.find(m => !ModAcronym.listContains(m.toString(), possibleMods)) !==
        undefined
    ) {
      // there is a mod that can't be matched to any of required/optional/exclusive groups
      return false;
    }

    // we need to keep track of group check results to perform final pruning
    const checkResults: {group: ModGroup; checkResult: boolean | undefined}[] =
      this.normalizedPattern.map(g => ({
        group: g,
        checkResult: undefined,
      }));

    // NM gets special treatment since it is not really a mod,
    // but an acronym for scores that don't have any mods:
    for (const entry of checkResults) {
      const group = entry.group;
      if (group.mods.find(m => m.is('NM'))) {
        switch (group.type) {
          case 'required': {
            if (group.mods.length > 1) {
              // impossible pattern
              return false;
            }
            if (mods.length > 0) {
              // absence of mods was required but there are mods
              return false;
            }
            // there are no mods, NM required group passes the check
            entry.checkResult = true;
            continue;
          }
          case 'optional': {
            if (group.mods.length > 1) {
              // this optional group can never be satisfied
              entry.checkResult = false;
              continue;
            }
            if (mods.length > 0) {
              // this optional group is not satisfied
              entry.checkResult = false;
              continue;
            }
            // optional group passed NM check
            entry.checkResult = true;
            continue;
          }
          case 'exclusive': {
            if (mods.length === 0) {
              // group is satisfied by NM acronym
              entry.checkResult = true;
            }
            continue;
          }
          case 'prohibited': {
            if (mods.length === 0) {
              // NM was not allowed
              return false;
            }
            continue;
          }
        }
      }
    }

    for (const entry of checkResults) {
      if (entry.checkResult !== undefined) {
        continue;
      }
      const group = entry.group;
      switch (group.type) {
        case 'required': {
          const missingMod = group.mods.find(
            m => !ModAcronym.listContains(m.toString(), mods)
          );
          if (missingMod !== undefined) {
            return false;
          }
          entry.checkResult = true;
          continue;
        }
        case 'optional': {
          const missingMod = group.mods.find(
            m => !ModAcronym.listContains(m.toString(), mods)
          );
          if (missingMod !== undefined) {
            entry.checkResult = false;
          }
          entry.checkResult = true;
          continue;
        }
        case 'exclusive': {
          if (
            group.mods.filter(m => ModAcronym.listContains(m.toString(), mods))
              .length !== 1
          ) {
            // only one mod from an exclusive group should be present in mod list
            return false;
          }
          entry.checkResult = true;
          continue;
        }
        case 'prohibited': {
          const prohibitedMod = group.mods.find(m =>
            ModAcronym.listContains(m.toString(), mods)
          );
          if (prohibitedMod !== undefined) {
            return false;
          }
          entry.checkResult = true;
          continue;
        }
      }
    }

    // remove optional groups that did not match from possible mods
    const finalPossibleMods = checkResults
      .filter(r => ['required', 'optional', 'exclusive'].includes(r.group.type))
      .filter(r => (r.group.type === 'optional' ? r.checkResult : true))
      .map(r => r.group.mods)
      .flat();
    // and perform same check as before
    if (
      shouldCheckForPossibleMods &&
      mods.find(
        m => !ModAcronym.listContains(m.toString(), finalPossibleMods)
      ) !== undefined
    ) {
      return false;
    }
    // all groups were checked
    // all possible return false expressions were executed
    // we can only return true now
    return true;
  }
}
