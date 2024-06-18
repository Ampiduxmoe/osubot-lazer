import {SqlDbTable} from '../SqlDbTable';
import {AppUserApiRequestsCountsRepository} from '../../../repository/repositories/AppUserApiRequestsCountsRepository';
import {
  AppUserApiRequestsCount,
  AppUserApiRequestsCountKey,
} from '../../../repository/models/AppUserApiRequestsCount';

export class AppUserApiRequestsCountsTable
  extends SqlDbTable
  implements AppUserApiRequestsCountsRepository
{
  tableName = 'app_user_api_requests_counts';

  private selectModelFields = `

SELECT
  time_window_id as timeWindowId,
  app_user_id as appUserId,
  target,
  subtarget,
  count

  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  time_window_id INTEGER,
  app_user_id TEXT,
  target TEXT,
  subtarget TEXT,
  count INTEGER
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(
    key: AppUserApiRequestsCountKey
  ): Promise<AppUserApiRequestsCount | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  time_window_id = ? AND
  app_user_id = ? AND
  target = ? AND
  subtarget = ?
LIMIT 1

    `.trim();
    return await this.db.get(query, [
      key.timeWindowId,
      key.appUserId,
      key.target,
      key.subtarget,
    ]);
  }

  async add(value: AppUserApiRequestsCount): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  time_window_id,
  app_user_id,
  target,
  subtarget,
  count
) VALUES (?, ?, ?, ?, ?)

    `.trim();
    await this.db.run(query, [
      value.timeWindowId,
      value.appUserId,
      value.target,
      value.subtarget,
      value.count,
    ]);
  }

  async update(value: AppUserApiRequestsCount): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  count = ?
WHERE
  time_window_id = ? AND
  app_user_id = ? AND
  target = ? AND
  subtarget = ?
    
    `.trim();
    await this.db.run(query, [
      value.count,
      value.timeWindowId,
      value.appUserId,
      value.target,
      value.subtarget,
    ]);
  }

  async delete(key: AppUserApiRequestsCountKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  time_window_id = ? AND
  app_user_id = ? AND
  target = ? AND
  subtarget = ?
  
    `.trim();
    await this.db.run(query, [
      key.timeWindowId,
      key.appUserId,
      key.target,
      key.subtarget,
    ]);
  }

  async getAllByTimeWindows(
    time_window_ids: number[]
  ): Promise<AppUserApiRequestsCount[]> {
    const timeWindowsPlaceholders = time_window_ids.map(() => '?').join(',');
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  time_window_id in (${timeWindowsPlaceholders})

    `.trim();
    return await this.db.getAll(query, [time_window_ids]);
  }

  async getAllByAppUserAndTimeWindows(
    app_user_id: string,
    time_window_ids: number[]
  ): Promise<AppUserApiRequestsCount[]> {
    const timeWindowsPlaceholders = time_window_ids.map(() => '?').join(',');
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  app_user_id = ? AND
  time_window_id in (${timeWindowsPlaceholders})

    `.trim();
    return await this.db.getAll(query, [app_user_id, ...time_window_ids]);
  }
}
