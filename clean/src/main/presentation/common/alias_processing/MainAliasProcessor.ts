import {AliasProcessor} from './AliasProcessor';

export class MainAliasProcessor implements AliasProcessor {
  match(text: string, pattern: string): boolean {
    const textLowercase = text.toLowerCase();
    const patternLowercase = pattern.toLowerCase();
    if (pattern.endsWith('*')) {
      if (
        textLowercase.startsWith(
          patternLowercase.substring(0, pattern.length - 1)
        )
      ) {
        return true;
      }
    }
    if (textLowercase === patternLowercase) {
      return true;
    }
    return false;
  }
  process(text: string, pattern: string, replacement: string): string {
    if (pattern.endsWith('*')) {
      return replacement + text.substring(pattern.length - 1);
    }
    return replacement;
  }
}
