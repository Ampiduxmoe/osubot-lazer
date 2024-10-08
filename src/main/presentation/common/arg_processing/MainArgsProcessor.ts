import {ValueExtractor, ArgsProcessor} from './ArgsProcessor';
import {CommandArgument} from './CommandArgument';

export class MainArgsProcessor implements ArgsProcessor {
  remainingTokens: string[];
  private args: CommandArgument<unknown>[];
  constructor(tokensRef: string[], args: CommandArgument<unknown>[]) {
    this.remainingTokens = tokensRef;
    this.args = args;
  }
  use<T>(arg: CommandArgument<T>): ValueExtractor<T> {
    if (!this.args.includes(arg)) {
      throw Error(
        `Attempted to use CommandArgument foreign to this processor ${arg.displayName}`
      );
    }
    return new MainValueExtractor(this.remainingTokens, arg);
  }
}

class MainValueExtractor<T> implements ValueExtractor<T> {
  private index: number | undefined = undefined;
  private tokensRef: string[];
  private arg: CommandArgument<T>;
  constructor(tokensRef: string[], arg: CommandArgument<T>) {
    this.tokensRef = tokensRef;
    this.arg = arg;
  }
  at(index: number): ValueExtractor<T> {
    this.index = index;
    return this;
  }
  get(): T | undefined {
    let alreadyMatched = false;
    if (this.index === undefined) {
      const matchingTokenIndex = this.tokensRef.findIndex(t =>
        this.arg.match(t)
      );
      if (matchingTokenIndex === -1) {
        return undefined;
      }
      this.index = matchingTokenIndex;
      alreadyMatched = true;
    }
    const index = this.index!;
    if (index < 0 || index >= this.tokensRef.length) {
      return undefined;
    }
    const token = this.tokensRef[this.index!];
    if (alreadyMatched || this.arg.match(token)) {
      return this.arg.parse(token);
    } else {
      return undefined;
    }
  }
  getWithToken(): [T | undefined, string | undefined] {
    const value = this.get();
    if (value === undefined) {
      return [undefined, undefined];
    }
    return [value, this.tokensRef[this.index!]];
  }
  extract(): T | undefined {
    const value = this.get();
    if (value === undefined) {
      return undefined;
    }
    this.tokensRef.splice(this.index!, 1);
    this.index = undefined;
    return value;
  }
  extractWithToken(): [T | undefined, string | undefined] {
    const result = this.getWithToken();
    if (result[0] === undefined) {
      return result;
    }
    this.tokensRef.splice(this.index!, 1);
    this.index = undefined;
    return result;
  }
}
