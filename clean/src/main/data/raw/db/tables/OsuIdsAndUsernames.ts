import {OperationExecutionResult} from '../SqlDb';
import {SqlDbTable} from '../SqlDbTable';
import {
  OsuIdAndUsername,
  OsuIdAndUsernameKey,
} from '../entities/OsuIdAndUsername';
import {Cacheable} from '../entities/Cacheable';
import {Timespan} from '../../../../../primitives/Timespan';

export abstract class OsuIdsAndUsernames extends SqlDbTable<
  OsuIdAndUsername,
  OsuIdAndUsernameKey
> {
  tableName = 'osu_ids_and_usernames';

  readonly expireTimeDays: number = 7;
}

export class OsuIdsAndUsernamesImpl extends OsuIdsAndUsernames {
  async createTable(): Promise<OperationExecutionResult> {
    return await this.db.run(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (id INTEGER, username TEXT, server INTEGER, creation_time INTEGER, expires_at INTEGER)`,
      []
    );
  }
  async get(key: OsuIdAndUsernameKey): Promise<OsuIdAndUsername | undefined> {
    const cacheable = await this.db.get<Cacheable<OsuIdAndUsername>>(
      `SELECT * FROM ${this.tableName} WHERE username = ? COLLATE NOCASE AND server = ? LIMIT 1`,
      [key.username, key.server]
    );
    if (cacheable === undefined) {
      return undefined;
    }
    if (Date.now() >= cacheable.expires_at) {
      await this.delete(cacheable as OsuIdAndUsername);
      return undefined;
    }
    return cacheable as OsuIdAndUsername;
  }
  async add(value: OsuIdAndUsername): Promise<OperationExecutionResult> {
    const now = Date.now();
    const expireTimeMillis = new Timespan()
      .addDays(this.expireTimeDays)
      .totalMiliseconds();
    return await this.db.run(
      `INSERT INTO ${this.tableName} (id, username, server, creation_time, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [value.id, value.username, value.server, now, now + expireTimeMillis]
    );
  }
  async update(value: OsuIdAndUsername): Promise<OperationExecutionResult> {
    return await this.db.run(
      `UPDATE ${this.tableName} SET id = ? WHERE username = ? COLLATE NOCASE AND server = ?`,
      [value.id, value.username, value.server]
    );
  }
  async delete(value: OsuIdAndUsername): Promise<OperationExecutionResult> {
    return await this.db.run(
      `DELETE FROM ${this.tableName} WHERE username = ? COLLATE NOCASE AND server = ?`,
      [value.username, value.server]
    );
  }
}
