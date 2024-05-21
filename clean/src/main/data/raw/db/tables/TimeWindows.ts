import {OperationExecutionResult} from '../SqlDb';
import {SqlDbTable} from '../SqlDbTable';
import {TimeWindow, TimeWindowKey} from '../entities/TimeWindow';

export abstract class TimeWindows extends SqlDbTable<
  TimeWindow,
  TimeWindowKey
> {
  tableName = 'time_windows';

  abstract getAllByIds(ids: number[]): Promise<TimeWindow[]>;

  abstract getAllByTimeInterval(
    start_time: number,
    end_time: number
  ): Promise<TimeWindow[]>;

  abstract addAll(values: TimeWindow[]): Promise<OperationExecutionResult>;

  abstract deleteAll(values: TimeWindow[]): Promise<OperationExecutionResult>;
}

export class TimeWindowsImpl extends TimeWindows {
  async createTable(): Promise<OperationExecutionResult> {
    return await this.db.run(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (id INTEGER PRIMARY KEY, start_time INTEGER, end_time INTEGER)`,
      []
    );
  }
  async get(key: TimeWindowKey): Promise<TimeWindow | undefined> {
    return await this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [
      key.id,
    ]);
  }
  async add(value: TimeWindow): Promise<OperationExecutionResult> {
    return await this.db.run(
      `INSERT INTO ${this.tableName} (start_time, end_time) VALUES (?, ?)`,
      [value.start_time, value.end_time]
    );
  }
  async update(value: TimeWindow): Promise<OperationExecutionResult> {
    return await this.db.run(
      `UPDATE ${this.tableName} SET start_time = ?, end_time = ? WHERE id = ?`,
      [value.start_time, value.end_time, value.id]
    );
  }
  async delete(value: TimeWindow): Promise<OperationExecutionResult> {
    return await this.db.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [
      value.id,
    ]);
  }
  async getAllByIds(ids: number[]): Promise<TimeWindow[]> {
    const idPlaceholders = ids.map(() => '?').join(',');
    return await this.db.getAll(
      `SELECT * FROM ${this.tableName} WHERE id in (${idPlaceholders})`,
      ids
    );
  }
  async getAllByTimeInterval(
    start_time: number,
    end_time: number
  ): Promise<TimeWindow[]> {
    return await this.db.getAll(
      `SELECT * FROM ${this.tableName} WHERE start_time >= ? AND end_time <= ?`,
      [start_time, end_time]
    );
  }
  async addAll(values: TimeWindow[]): Promise<OperationExecutionResult> {
    const valuePlaceholders = values.map(() => '(?, ?)').join(', ');
    const valuesUnwrapped = values.map(x => [x.start_time, x.end_time]).flat();
    return await this.db.run(
      `INSERT INTO ${this.tableName} (start_time, end_time) VALUES ${valuePlaceholders}`,
      valuesUnwrapped
    );
  }
  async deleteAll(values: TimeWindow[]): Promise<OperationExecutionResult> {
    const idPlaceholders = values.map(() => '?').join(',');
    const ids = values.map(x => x.id);
    return await this.db.run(
      `DELETE FROM ${this.tableName} WHERE id in (${idPlaceholders})`,
      ids
    );
  }
}
