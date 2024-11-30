export class MaybeDeferred<T> {
  resultValue: T | Promise<T>;
  calculationType: CalculationType;

  private constructor(
    resultValue: T | Promise<T>,
    calculationType: CalculationType
  ) {
    this.resultValue = resultValue;
    this.calculationType = calculationType;
  }

  transform<R>(fn: (result: T) => R): R | Promise<R> {
    if (this.resultValue instanceof Promise) {
      return this.resultValue.then(res => fn(res));
    }
    return fn(this.resultValue);
  }

  /**
   * Creates new {@link MaybeDeferred} instance
   * with current {@link calculationType} value
   */
  extend<R>(fn: (result: T) => R | Promise<R>): MaybeDeferred<R> {
    if (this.resultValue instanceof Promise) {
      return new MaybeDeferred(
        this.resultValue.then(res => fn(res)),
        this.calculationType
      );
    }
    return new MaybeDeferred(fn(this.resultValue), this.calculationType);
  }

  /**
   * Creates new {@link MaybeDeferred} instance
   * with current {@link calculationType} value
   */
  chain<R>(fn: (result: T) => MaybeDeferred<R>): MaybeDeferred<R> {
    if (this.resultValue instanceof Promise) {
      return new MaybeDeferred(
        this.resultValue.then(res => fn(res).resultValue),
        this.calculationType
      );
    }
    return new MaybeDeferred(
      fn(this.resultValue).resultValue,
      this.calculationType
    );
  }

  /**
   * Creates an instance with CalculationType.Immediate.
   *
   * Use this when calculation is not asynchronous at all.
   */
  static fromValue<T>(resultValue: T): MaybeDeferred<T> {
    return new MaybeDeferred(resultValue, CalculationType.Immediate);
  }

  /**
   * Creates an instance with CalculationType.LocalReadWrite.
   *
   * Use this when calculation is guaranteed to be done in under 1 second.
   */
  static fromInstantPromise<T>(resultValue: Promise<T>): MaybeDeferred<T> {
    return new MaybeDeferred(resultValue, CalculationType.LocalReadWrite);
  }

  /**
   * Creates an instance with CalculationType.RemoteNetworkCalls.
   *
   * Use this when calculation is guaranteed to be done in under 10 seconds.
   */
  static fromFastPromise<T>(resultValue: Promise<T>): MaybeDeferred<T> {
    return new MaybeDeferred(resultValue, CalculationType.RemoteNetworkCalls);
  }

  /**
   * Creates an instance with CalculationType.LongBackgroundWork.
   *
   * Use this when calculation is estimated to take longer than 10 seconds.
   */
  static fromSlowPromise<T>(resultValue: Promise<T>): MaybeDeferred<T> {
    return new MaybeDeferred(resultValue, CalculationType.LongBackgroundWork);
  }
}

export enum CalculationType {
  Immediate,
  LocalReadWrite,
  RemoteNetworkCalls,
  LongBackgroundWork,
}
