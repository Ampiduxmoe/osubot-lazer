import {OperationExecutionResult} from '../SqlDb';
import {SqlDbTable} from '../SqlDbTable';
import {
  TimeWindow,
  TimeWindowIdsKey,
  TimeWindowKey,
  TimeWindowIntervalKey,
} from '../entities/TimeWindow';

export class TimeWindows extends SqlDbTable<TimeWindow[], TimeWindowKey> {
  tableName = 'time_windows';
  async createTable(): Promise<OperationExecutionResult> {
    return await this.db.run(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (id INTEGER PRIMARY KEY, start_time INTEGER, end_time INTEGER)`,
      []
    );
  }
  async get(key: TimeWindowKey): Promise<TimeWindow[] | undefined> {
    const idsKey = key as TimeWindowIdsKey;
    if (idsKey.ids !== undefined) {
      const idPlaceholders = idsKey.ids.map(() => '?').join(',');
      return await this.db.getAll(
        `SELECT * FROM ${this.tableName} WHERE id in (${idPlaceholders})`,
        idsKey.ids
      );
    }
    const timeIntervalKey = key as TimeWindowIntervalKey;
    if (
      timeIntervalKey.start_time !== undefined &&
      timeIntervalKey.end_time !== undefined
    ) {
      return await this.db.getAll(
        `SELECT * FROM ${this.tableName} WHERE start_time >= ? AND end_time <= ?`,
        [timeIntervalKey.start_time, timeIntervalKey.end_time]
      );
    }
    throw Error('Key type detection is not exhaustive');
  }
  async add(value: TimeWindow[]): Promise<OperationExecutionResult> {
    // TODO transaction
    for (const v of value) {
      await this.addOne(v);
    }
    return {isSuccess: true};
  }
  async update(value: TimeWindow[]): Promise<OperationExecutionResult> {
    // TODO transaction
    for (const v of value) {
      await this.updateOne(v);
    }
    return {isSuccess: true};
  }
  async delete(value: TimeWindow[]): Promise<OperationExecutionResult> {
    const idPlaceholders = value.map(() => '?').join(',');
    const ids = value.map(x => x.id);
    return await this.db.run(
      `DELETE FROM ${this.tableName} WHERE id in (${idPlaceholders})`,
      ids
    );
  }
  private async addOne(value: TimeWindow): Promise<OperationExecutionResult> {
    return await this.db.run(
      `INSERT INTO ${this.tableName} (start_time, end_time) VALUES (?, ?)`,
      [value.start_time, value.end_time]
    );
  }
  private async updateOne(
    value: TimeWindow
  ): Promise<OperationExecutionResult> {
    return await this.db.run(
      `UPDATE ${this.tableName} SET start_time = ?, end_time = ? WHERE id = ?`,
      [value.start_time, value.end_time, value.id]
    );
  }
}