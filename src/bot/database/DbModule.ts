import {BotDb} from './BotDb';

export abstract class DbModule<T> {
  parentDb: BotDb;
  tableName: string;
  private _isInitializing = false;
  private _isInitialized = false;

  constructor(parentDb: BotDb, tableName: string) {
    this.parentDb = parentDb;
    this.tableName = tableName;
  }

  async init(): Promise<void> {
    if (this._isInitializing || this._isInitialized) {
      return;
    }
    try {
      this._isInitializing = true;
      console.log(`Initializing database module ${this.tableName}...`);
      await this.createTable();
      this._isInitialized = true;
      console.log(`Database module ${this.tableName} initialized`);
    } finally {
      this._isInitializing = false;
    }
  }
  abstract createTable(): Promise<void>;

  async get(stmt: string, opts: unknown[] = []): Promise<T | undefined> {
    return this.parentDb.get(stmt, opts);
  }

  abstract add(value: T): Promise<void>;
  abstract update(value: T): Promise<void>;
  abstract delete(value: T): Promise<void>;
}
