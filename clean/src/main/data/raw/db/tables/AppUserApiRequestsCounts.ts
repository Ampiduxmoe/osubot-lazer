import {OperationExecutionResult} from '../SqlDb';
import {SqlDbTable} from '../SqlDbTable';
import {
  AppUserApiRequestsCount,
  AppUserApiRequestsCountKey,
  isAppUserApiRequestsUserWithTimeWindowsKey,
  isAppUserApiRequestsTimeWindowsKey,
  isAppUserApiRequestsUserKey,
} from '../entities/AppUserApiRequestsCount';

export class AppUserApiRequestsCounts extends SqlDbTable<
  AppUserApiRequestsCount[],
  AppUserApiRequestsCountKey
> {
  tableName = 'app_user_api_requests_summaries';
  async createTable(): Promise<OperationExecutionResult> {
    return await this.db.run(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (time_window_id INTEGER, app_user_id TEXT, target TEXT, subtarget TEXT, count INTEGER)`,
      []
    );
  }
  async get(
    key: AppUserApiRequestsCountKey
  ): Promise<AppUserApiRequestsCount[] | undefined> {
    if (isAppUserApiRequestsUserWithTimeWindowsKey(key)) {
      const timeWindowsPlaceholders = key.time_window_ids
        .map(() => '?')
        .join(',');
      return await this.db.getAll(
        `SELECT * FROM ${this.tableName} WHERE app_user_id = ? AND time_window_id in (${timeWindowsPlaceholders})`,
        [key.app_user_id, ...key.time_window_ids]
      );
    }
    if (isAppUserApiRequestsTimeWindowsKey(key)) {
      const timeWindowsPlaceholders = key.time_window_ids
        .map(() => '?')
        .join(',');
      return await this.db.getAll(
        `SELECT * FROM ${this.tableName} WHERE time_window_id in (${timeWindowsPlaceholders})`,
        key.time_window_ids
      );
    }
    if (isAppUserApiRequestsUserKey(key)) {
      return await this.db.getAll(
        `SELECT * FROM ${this.tableName} WHERE app_user_id = ?`,
        [key.app_user_id]
      );
    }
    throw Error('Key type detection is not exhaustive');
  }
  async add(
    value: AppUserApiRequestsCount[]
  ): Promise<OperationExecutionResult> {
    // TODO transaction
    for (const v of value) {
      await this.addOne(v);
    }
    return {isSuccess: true};
  }
  async update(
    value: AppUserApiRequestsCount[]
  ): Promise<OperationExecutionResult> {
    // TODO transaction
    for (const v of value) {
      await this.updateOne(v);
    }
    return {isSuccess: true};
  }
  async delete(
    value: AppUserApiRequestsCount[]
  ): Promise<OperationExecutionResult> {
    // TODO transaction
    for (const v of value) {
      await this.deleteOne(v);
    }
    return {isSuccess: true};
  }

  private async addOne(
    value: AppUserApiRequestsCount
  ): Promise<OperationExecutionResult> {
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
  private async updateOne(
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
  private async deleteOne(
    value: AppUserApiRequestsCount
  ): Promise<OperationExecutionResult> {
    return await this.db.run(
      `DELETE FROM ${this.tableName} WHERE time_window_id = ? AND app_user_id = ? AND target = ? AND subtarget = ?`,
      [value.time_window_id, value.app_user_id, value.target, value.subtarget]
    );
  }
}
