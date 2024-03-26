export abstract class Result<T> {
  readonly isSuccess: boolean = this instanceof Success;
  readonly isFailure: boolean = this instanceof Failure;

  /** Unsafe cast to Success, used as shorter version of safe cast after checking this.isSuccess */
  private asSuccess(): Success<T> {
    return this as unknown as Success<T>;
  }

  /** Unsafe cast to Failure, used as shorter version of safe cast after checking this.isFailure */
  private asFailure(): Failure<T> {
    return this as unknown as Failure<T>;
  }

  getValue(): T | undefined {
    if (this.isSuccess) {
      return this.asSuccess().value;
    } else {
      return undefined;
    }
  }

  getErrors(): Error[] | undefined {
    if (this.isFailure) {
      return this.asFailure().errors;
    } else {
      return undefined;
    }
  }

  ifSuccess(action: (value: T) => void): Result<T> {
    if (this.isSuccess) {
      action(this.asSuccess().value);
    }
    return this;
  }

  ifFailure(action: (errors: Error[]) => void): Result<T> {
    if (this.isFailure) {
      action(this.asFailure().errors);
    }
    return this;
  }

  map<R, S>(
    transformSuccess: (value: T) => R,
    transformFailure: (errors: Error[]) => S
  ): R | S {
    if (this.isSuccess) {
      return transformSuccess(this.asSuccess().value);
    } else {
      return transformFailure(this.asFailure().errors);
    }
  }

  static ok<T>(value: T): Result<T> {
    return new Success(value);
  }

  static fail<T>(errors: Error[]): Result<T> {
    return new Failure(errors);
  }
}

class Success<T> extends Result<T> {
  readonly value: T;

  constructor(value: T) {
    super();
    this.value = value;
  }
}

class Failure<T> extends Result<T> {
  readonly errors: Error[];

  constructor(errors: Error[]) {
    super();
    this.errors = errors;
  }
}
