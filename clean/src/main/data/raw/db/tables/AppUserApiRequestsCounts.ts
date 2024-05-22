import {OperationExecutionResult} from '../SqlDb';
import {SqlDbTable} from '../SqlDbTable';
import {
  AppUserApiRequestsCount,
  AppUserApiRequestsCountKey,
} from '../entities/AppUserApiRequestsCount';

export abstract class AppUserApiRequestsCounts extends SqlDbTable<
  AppUserApiRequestsCountKey,
  AppUserApiRequestsCount
> {
  tableName = 'app_user_api_requests_counts';

  abstract getAllByUser(
    app_user_id: string
  ): Promise<AppUserApiRequestsCount[]>;

  abstract getAllByTimeWindows(
    time_window_ids: number[]
  ): Promise<AppUserApiRequestsCount[]>;

  abstract getAllByAppUserAndTimeWindows(
    app_user_id: string,
    time_window_ids: number[]
  ): Promise<AppUserApiRequestsCount[]>;
}

export class AppUserApiRequestsCountsImpl extends AppUserApiRequestsCounts {
  async createTable(): Promise<OperationExecutionResult> {
    return await this.db.run(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (time_window_id INTEGER, app_user_id TEXT, target TEXT, subtarget TEXT, count INTEGER)`,
      []
    );
  }
  async get(
    key: AppUserApiRequestsCountKey
  ): Promise<AppUserApiRequestsCount | undefined> {
    return await this.db.get(
      `SELECT * FROM ${this.tableName} WHERE time_window_id = ? AND app_user_id = ? AND target = ? AND subtarget = ? LIMIT 1`,
      [key.time_window_id, key.app_user_id, key.target, key.subtarget]
    );
  }
  async add(value: AppUserApiRequestsCount): Promise<OperationExecutionResult> {
    return await this.db.run(
      `INSERT INTO ${this.tableName} (time_window_id, app_user_id, target, subtarget, count) VALUES (?, ?, ?, ?, ?)`,
      [
        value.time_window_id,
        value.app_user_id,
        value.target,
        value.subtarget,
        value.count,
      ]
    );
  }
  async update(
    value: AppUserApiRequestsCount
  ): Promise<OperationExecutionResult> {
    return await this.db.run(
      `UPDATE ${this.tableName} SET count = ? WHERE time_window_id = ? AND app_user_id = ? AND target = ? AND subtarget = ?`,
      [
        value.count,
        value.time_window_id,
        value.app_user_id,
        value.target,
        value.subtarget,
      ]
    );
  }
  async delete(
    key: AppUserApiRequestsCountKey
  ): Promise<OperationExecutionResult> {
    return await this.db.run(
      `DELETE FROM ${this.tableName} WHERE time_window_id = ? AND app_user_id = ? AND target = ? AND subtarget = ?`,
      [key.time_window_id, key.app_user_id, key.target, key.subtarget]
    );
  }
  async getAllByUser(app_user_id: string): Promise<AppUserApiRequestsCount[]> {
    return await this.db.getAll(
      `SELECT * FROM ${this.tableName} WHERE app_user_id = ?`,
      [app_user_id]
    );
  }
  async getAllByTimeWindows(
    time_window_ids: number[]
  ): Promise<AppUserApiRequestsCount[]> {
    const timeWindowsPlaceholders = time_window_ids.map(() => '?').join(',');
    return await this.db.getAll(
      `SELECT * FROM ${this.tableName} WHERE time_window_id in (${timeWindowsPlaceholders})`,
      time_window_ids
    );
  }
  async getAllByAppUserAndTimeWindows(
    app_user_id: string,
    time_window_ids: number[]
  ): Promise<AppUserApiRequestsCount[]> {
    const timeWindowsPlaceholders = time_window_ids.map(() => '?').join(',');
    return await this.db.getAll(
      `SELECT * FROM ${this.tableName} WHERE app_user_id = ? AND time_window_id in (${timeWindowsPlaceholders})`,
      [app_user_id, ...time_window_ids]
    );
  }
}
