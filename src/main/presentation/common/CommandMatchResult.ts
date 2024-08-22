import {CommandArgument} from './arg_processing/CommandArgument';

export class CommandMatchResult<T> {
  readonly matchLevel: MatchLevel;

  /** Shorthand for `matchLevel === MatchLevel.FULL_MATCH` */
  get isFullMatch(): boolean {
    return this.matchLevel === MatchLevel.FULL_MATCH;
  }
  /** Shorthand for `matchLevel === MatchLevel.PARTIAL_MATCH` */
  get isPartialMatch(): boolean {
    return this.matchLevel === MatchLevel.PARTIAL_MATCH;
  }
  /** Shorthand for `matchLevel === MatchLevel.NO_MATCH` */
  get doesNotMatch(): boolean {
    return this.matchLevel === MatchLevel.NO_MATCH;
  }

  /**
   * Mapping of tokens to CommandArgument.
   * Holds value only if {@link matchLevel} is {@link MatchLevel.PARTIAL_MATCH}
   */
  readonly partialMapping: TokenMatchEntry[] | undefined | undefined;

  /**
   * Arguments required to execute command.
   * Holds value only if {@link matchLevel} is {@link MatchLevel.FULL_MATCH}
   */
  readonly commandArgs: T | undefined;

  private constructor(
    matchLevel: MatchLevel,
    partialMapping: TokenMatchEntry[] | undefined,
    executionArgs: T | undefined
  ) {
    this.matchLevel = matchLevel;
    this.partialMapping = partialMapping;
    this.commandArgs = executionArgs;
  }

  static ok<R>(executionArgs: R): CommandMatchResult<R> {
    return new CommandMatchResult(
      MatchLevel.FULL_MATCH,
      undefined,
      executionArgs
    );
  }

  static partial<R>(partialMapping: TokenMatchEntry[]): CommandMatchResult<R> {
    return new CommandMatchResult<R>(
      MatchLevel.PARTIAL_MATCH,
      partialMapping,
      undefined
    );
  }

  static fail<R>(): CommandMatchResult<R> {
    return new CommandMatchResult<R>(MatchLevel.NO_MATCH, undefined, undefined);
  }
}

export enum MatchLevel {
  NO_MATCH,
  PARTIAL_MATCH,
  FULL_MATCH,
}

export type TokenMatchEntry = {
  token: string;
  argument: CommandArgument<unknown> | undefined;
};
