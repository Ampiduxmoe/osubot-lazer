import {SqlDb} from './SqlDb';

export abstract class SqlDbTable {
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
    await this.createTable();
    console.log(`Database table ${this.tableName} initialized`);
    this.isInitializing = false;
  }

  abstract createTable(): Promise<void>;
}
