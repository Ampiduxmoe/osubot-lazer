import {OperationExecutionResult} from '../SqlDb';
import {SqlDbTable} from '../SqlDbTable';
import {AppUserInfo, AppUserInfoKey} from '../entities/AppUserInfo';

export class AppUsers extends SqlDbTable<AppUserInfo, AppUserInfoKey> {
  tableName = 'app_users';
  async createTable(): Promise<OperationExecutionResult> {
    return await this.db.run(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (id TEXT, server INTEGER, osu_id INTEGER, username TEXT, ruleset INTEGER)`,
      []
    );
  }
  async get(key: AppUserInfoKey): Promise<AppUserInfo | undefined> {
    return await this.db.get(
      `SELECT * FROM ${this.tableName} WHERE id = ? AND server = ? LIMIT 1`,
      [key.id, key.server]
    );
  }
  async add(value: AppUserInfo): Promise<OperationExecutionResult> {
    return await this.db.run(
      `INSERT INTO ${this.tableName} (id, server, osu_id, username, ruleset) VALUES (?, ?, ?, ?, ?)`,
      [value.id, value.server, value.osu_id, value.username, value.ruleset]
    );
  }
  async update(value: AppUserInfo): Promise<OperationExecutionResult> {
    return await this.db.run(
      `UPDATE ${this.tableName} SET osu_id = ?, username = ?, ruleset = ? WHERE id = ? AND server = ?`,
      [value.osu_id, value.username, value.ruleset, value.id, value.server]
    );
  }
  async delete(value: AppUserInfo): Promise<OperationExecutionResult> {
    return await this.db.run(
      `DELETE FROM ${this.tableName} WHERE id = ? AND server = ?`,
      [value.id, value.server]
    );
  }
}
