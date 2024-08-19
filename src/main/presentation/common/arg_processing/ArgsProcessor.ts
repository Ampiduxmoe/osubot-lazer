import {CommandArgument} from './CommandArgument';

export interface ArgsProcessor {
  get remainingTokens(): string[];
  use<T>(arg: CommandArgument<T>): ValueExtractor<T>;
}

export interface ValueExtractor<T> {
  at(pos: number): ValueExtractor<T>;
  get(): T | undefined;
  getWithToken(): [T | undefined, string | undefined];
  extract(): T | undefined;
  extractWithToken(): [T | undefined, string | undefined];
}
