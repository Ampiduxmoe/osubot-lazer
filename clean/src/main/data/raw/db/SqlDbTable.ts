import {SqlDb, OperationExecutionResult} from './SqlDb';

export abstract class SqlDbTable<T, TKey> {
  abstract tableName: string;

  db: SqlDb;
  constructor(db: SqlDb) {
    this.db = db;
  }

  private isInitializing = false;
  private isInitialized = false;
  async init(): Promise<void> {
    if (this.isInitializing || this.isInitialized) {
      return;
    }
    this.isInitializing = true;
    console.log(`Initializing database table ${this.tableName}...`);
    const result = await this.createTable();
    if (result.isSuccess) {
      this.isInitialized = true;
    }
    console.log(`Database table ${this.tableName} initialized`);
    this.isInitializing = false;
  }

  abstract createTable(): Promise<OperationExecutionResult>;

  abstract get(key: TKey): Promise<T | undefined>;
  abstract add(value: T): Promise<OperationExecutionResult>;
  abstract update(value: T): Promise<OperationExecutionResult>;
  abstract delete(value: T): Promise<OperationExecutionResult>;
}
