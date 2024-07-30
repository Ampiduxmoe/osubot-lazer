import {ModAcronym} from '../../../primitives/ModAcronym';
import {ModPatternCollection} from '../../../primitives/ModPatternCollection';
import {ModCombinationMatcher} from './ModCombinationMatcher';

export class ModPatternCollectionMatcher {
  originalCollection: ModPatternCollection;
  earlyReturnValue: boolean | undefined;
  matchers: ModCombinationMatcher[];
  constructor(originalCollection: ModPatternCollection) {
    this.originalCollection = originalCollection;
    this.matchers = originalCollection.map(
      pattern => new ModCombinationMatcher(pattern)
    );
    if (this.matchers.length === 0) {
      this.earlyReturnValue = true;
    }
    if (this.matchers.find(m => m.earlyReturnValue === true) !== undefined) {
      // one of matchers always returns true
      this.earlyReturnValue = true;
    }
    if (
      this.matchers.length > 0 &&
      this.matchers.filter(m => m.earlyReturnValue === false).length ===
        this.matchers.length
    ) {
      // all matchers alawys return false
      this.earlyReturnValue = false;
    }
    if (
      this.earlyReturnValue !== undefined &&
      this.originalCollection.isInverted
    ) {
      this.earlyReturnValue = !this.earlyReturnValue;
    }
  }
  match(mods: ModAcronym[]): boolean {
    if (this.earlyReturnValue !== undefined) {
      return this.earlyReturnValue;
    }
    const directResult = this.matchers.find(m => m.match(mods)) !== undefined;
    if (this.originalCollection.isInverted) {
      return !directResult;
    }
    return directResult;
  }
}
