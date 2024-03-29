import {BotDb} from './BotDb';

export abstract class DbModule<T> {
  parentDb: BotDb;
  tableName: string;

  constructor(parentDb: BotDb, tableName: string) {
    this.parentDb = parentDb;
    this.tableName = tableName;
  }

  async init(): Promise<void> {
    console.log(`Initializing database module ${this.tableName}...`);
    await this.createTable();
    console.log(`Database module ${this.tableName} initialized`);
  }
  abstract createTable(): Promise<void>;

  async get(stmt: string, opts: unknown[] = []): Promise<T | undefined> {
    return this.parentDb.get(stmt, opts);
  }

  abstract add(value: T): Promise<void>;
  abstract update(value: T): Promise<void>;
  abstract delete(value: T): Promise<void>;
}
