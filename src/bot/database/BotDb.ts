import {Database, RunResult} from 'sqlite3';
import {DbModule} from './DbModule';
export class BotDb {
  filename: string;
  private _db: Database;
  private _modules: DbModule<unknown>[] = [];

  constructor(filename: string) {
    this.filename = filename;
    this._db = new Database(filename);
  }

  async init(): Promise<void> {
    console.log('Initializing database...');
    const promises: Promise<void>[] = [];
    for (const module of this._modules) {
      promises.push(module.init());
    }
    for (const promise of promises) {
      await promise;
    }
    console.log('Database initialized');
  }

  addModule(module: DbModule<unknown>) {
    this._modules.push(module);
  }

  addModules(modules: DbModule<unknown>[]) {
    for (const module of modules) {
      this.addModule(module);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getModule<T>(ctor: {new (...args: any): T}): T {
    for (const module of this._modules) {
      if (module instanceof ctor) {
        return module;
      }
    }
    throw Error(`Could not find database module with type ${ctor.name}`);
  }

  getModuleOrDefault<T, R>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctor: {new (...args: any): T},
    fallbackValue: R
  ): T | R {
    for (const module of this._modules) {
      if (module instanceof ctor) {
        return module;
      }
    }
    return fallbackValue;
  }

  async run(stmt: string, opts: unknown[] = []): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      this._db.run(stmt, opts, (res: RunResult, err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  async get<T>(stmt: string, opts: unknown[] = []): Promise<T | undefined> {
    return new Promise<T>((resolve, reject) => {
      this._db.get<T>(stmt, opts, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
}
