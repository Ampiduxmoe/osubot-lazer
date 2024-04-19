export interface SqlDb {
  run(stmt: string, opts: unknown[]): Promise<OperationExecutionResult>;
  get<T>(stmt: string, opts: unknown[]): Promise<T | undefined>;
}

export interface OperationExecutionResult {
  isSuccess: boolean;
}
