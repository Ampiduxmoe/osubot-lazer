export interface SqlDb {
  run(stmt: string, opts: unknown[]): Promise<OperationExecutionResult>;
  get<T>(stmt: string, opts: unknown[]): Promise<T | undefined>;
  getAll<T>(stmt: string, opts: unknown[]): Promise<T[]>;
}

export type OperationExecutionResult = {
  rowsChanged: number;
  lastInsertRowId: number;
};
