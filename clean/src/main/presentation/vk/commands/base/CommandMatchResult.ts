export class CommandMatchResult<T> {
  /** Whether command should be executed based on current context */
  isMatch: boolean;
  /** Parameters required by execute function. Must not be undefined if {@link isMatch} is true */
  commandParams: T | undefined;

  constructor(isMatch: boolean, executionParams: T | undefined) {
    this.isMatch = isMatch;
    this.commandParams = executionParams;
  }

  static ok<R>(executionParams: R): CommandMatchResult<R> {
    return new CommandMatchResult(true, executionParams);
  }

  static fail<R>(): CommandMatchResult<R> {
    return new CommandMatchResult<R>(false, undefined);
  }
}
