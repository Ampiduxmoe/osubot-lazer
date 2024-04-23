import {CommandArgument} from './CommandArgument';

export interface ArgsProcessor {
  remainingTokens: string[];
  use<T>(arg: CommandArgument<T>): ValueExtractor<T>;
}

export interface ValueExtractor<T> {
  at(pos: number): ValueExtractor<T>;
  get(): T | undefined;
  extract(): T | undefined;
}
