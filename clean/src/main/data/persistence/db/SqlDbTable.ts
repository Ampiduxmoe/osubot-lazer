import {SqlDb} from './SqlDb';

export abstract class SqlDbTable {
  abstract readonly tableName: string;

  readonly db: SqlDb;
  constructor(db: SqlDb) {
    this.db = db;

    let resolve!: (value: void | PromiseLike<void>) => void;
    this.initializationCompletedPromise = new Promise<void>(_resolve => {
      resolve = _resolve;
    });
    this.emitInitializationCompleted = resolve;
  }

  private initializationCompletedPromise: Promise<void>;
  private emitInitializationCompleted: () => void;

  private _isInitializing = false;
  private _isInitialized = false;
  get isInitializing(): boolean {
    return this._isInitializing;
  }
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async init(): Promise<void> {
    if (this.isInitializing || this.isInitialized) {
      return;
    }
    this._isInitializing = true;
    console.log(`Initializing database table ${this.tableName}...`);
    await this.createTable();
    console.log(`Database table ${this.tableName} initialized`);
    this._isInitializing = false;
    this.emitInitializationCompleted();
  }

  waitUntilInitialized = () => this.initializationCompletedPromise;

  abstract createTable(): Promise<void>;
}
