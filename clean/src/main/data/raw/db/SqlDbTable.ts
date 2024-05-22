import {SqlDb, OperationExecutionResult} from './SqlDb';

export abstract class SqlDbTable<
  TEntityKey extends object,
  TEntity extends TEntityKey,
> {
  abstract readonly tableName: string;

  readonly db: SqlDb;
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

  abstract get(key: TEntityKey): Promise<TEntity | undefined>;
  abstract add(value: TEntity): Promise<OperationExecutionResult>;
  abstract update(value: TEntity): Promise<OperationExecutionResult>;
  abstract delete(key: TEntityKey): Promise<OperationExecutionResult>;
}
