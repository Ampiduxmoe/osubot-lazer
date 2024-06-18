import sqlite3 from 'better-sqlite3';
import {OperationExecutionResult, SqlDb} from './SqlDb';

export class SqliteDb implements SqlDb {
  private sqliteDb: sqlite3.Database;
  readonly filename: string;
  constructor(filename: string) {
    this.filename = filename;
    this.sqliteDb = new sqlite3(filename);
    this.sqliteDb.pragma('journal_mode = WAL');
  }
  async run(stmt: string, opts: unknown[]): Promise<OperationExecutionResult> {
    const result = this.sqliteDb.prepare(stmt).run(...opts);
    if (result.lastInsertRowid > Number.MAX_SAFE_INTEGER) {
      throw Error('bigint conversion is not implemented');
    }
    return {
      rowsChanged: result.changes,
      lastInsertRowId: Number(result.lastInsertRowid),
    };
  }
  async get<T>(stmt: string, opts: unknown[]): Promise<T | undefined> {
    return this.sqliteDb.prepare<unknown[], T>(stmt).get(...opts);
  }
  async getAll<T>(stmt: string, opts: unknown[]): Promise<T[]> {
    return this.sqliteDb.prepare<unknown[], T>(stmt).all(...opts);
  }
}
