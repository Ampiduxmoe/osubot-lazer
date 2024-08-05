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
