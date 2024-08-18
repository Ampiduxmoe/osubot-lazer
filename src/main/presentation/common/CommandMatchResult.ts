import {CommandArgument} from './arg_processing/CommandArgument';

export class CommandMatchResult<T> {
  readonly matchLevel: MatchLevel;

  /** Shorthand for `matchLevel === MatchLevel.FULL_MATCH` */
  isFullMatch: boolean;
  /** Shorthand for `matchLevel === MatchLevel.PARTIAL_MATCH` */
  isPartialMatch: boolean;
  /** Shorthand for `matchLevel === MatchLevel.NO_MATCH` */
  doesNotMatch: boolean;

  /**
   * Mapping of tokens to CommandArgument.
   * Holds value only if {@link matchLevel} is {@link MatchLevel.PARTIAL_MATCH}
   */
  readonly partialMapping:
    | Readonly<Record<string, CommandArgument<unknown> | undefined>>
    | undefined;

  /**
   * Arguments required to execute command.
   * Holds value only if {@link matchLevel} is {@link MatchLevel.FULL_MATCH}
   */
  readonly commandArgs: T | undefined;

  private constructor(
    matchLevel: MatchLevel,
    partialMapping: Record<string, CommandArgument<unknown>> | undefined,
    executionArgs: T | undefined
  ) {
    this.matchLevel = matchLevel;
    this.partialMapping = partialMapping;
    this.commandArgs = executionArgs;

    this.isFullMatch = matchLevel === MatchLevel.FULL_MATCH;
    this.isPartialMatch = matchLevel === MatchLevel.PARTIAL_MATCH;
    this.doesNotMatch = matchLevel === MatchLevel.NO_MATCH;
  }

  static ok<R>(executionArgs: R): CommandMatchResult<R> {
    return new CommandMatchResult(
      MatchLevel.FULL_MATCH,
      undefined,
      executionArgs
    );
  }

  static partial<R>(
    partialMapping: Record<string, CommandArgument<unknown>> | undefined
  ): CommandMatchResult<R> {
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
  FULL_MATCH,
  PARTIAL_MATCH,
  NO_MATCH,
}
