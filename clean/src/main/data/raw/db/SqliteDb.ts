import {Database, RunResult} from 'sqlite3';
import {OperationExecutionResult, SqlDb} from './SqlDb';

export class SqliteDb implements SqlDb {
  private sqliteDb: Database;
  readonly filename: string;
  constructor(filename: string) {
    this.filename = filename;
    this.sqliteDb = new Database(filename);
  }
  run(stmt: string, opts: unknown[]): Promise<OperationExecutionResult> {
    return new Promise((resolve, reject) => {
      this.sqliteDb.run(stmt, opts, (_: RunResult, e: Error) => {
        if (e) {
          reject(e);
        } else {
          resolve({isSuccess: true});
        }
      });
    });
  }
  get<T>(stmt: string, opts: unknown[]): Promise<T | undefined> {
    return new Promise<T>((resolve, reject) => {
      this.sqliteDb.get<T>(stmt, opts, (e, row) => {
        if (e) {
          reject(e);
        } else {
          resolve(row);
        }
      });
    });
  }
  getAll<T>(stmt: string, opts: unknown[]): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      this.sqliteDb.all<T>(stmt, opts, (e, rows) => {
        if (e) {
          reject(e);
        } else {
          resolve(rows);
        }
      });
    });
  }
}
