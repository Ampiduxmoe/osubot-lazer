export class CommandMatchResult<T> {
  /** Whether command should be executed based on current context */
  readonly isMatch: boolean;
  /** Arguments required to execute command. Must not be undefined if {@link isMatch} is true */
  readonly commandArgs: T | undefined;

  constructor(isMatch: boolean, executionArgs: T | undefined) {
    this.isMatch = isMatch;
    this.commandArgs = executionArgs;
  }

  static ok<R>(executionArgs: R): CommandMatchResult<R> {
    return new CommandMatchResult(true, executionArgs);
  }

  static fail<R>(): CommandMatchResult<R> {
    return new CommandMatchResult<R>(false, undefined);
  }
}
