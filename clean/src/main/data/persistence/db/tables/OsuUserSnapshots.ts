import {OperationExecutionResult} from '../SqlDb';
import {SqlDbTable} from '../SqlDbTable';
import {OsuUserSnapshot, OsuUserSnapshotKey} from '../entities/OsuUserSnapshot';
import {Cacheable} from '../entities/Cacheable';
import {Timespan} from '../../../../../primitives/Timespan';

export abstract class OsuUserSnapshots extends SqlDbTable<
  OsuUserSnapshotKey,
  OsuUserSnapshot
> {
  tableName = 'osu_user_snapshots';

  readonly expireTimeHours: number = 24;
}

export class OsuUserSnapshotsImpl extends OsuUserSnapshots {
  async createTable(): Promise<OperationExecutionResult> {
    return await this.db.run(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (username TEXT, server INTEGER, id INTEGER, preferred_mode INTEGER, creation_time INTEGER, expires_at INTEGER)`,
      []
    );
  }
  async get(key: OsuUserSnapshotKey): Promise<OsuUserSnapshot | undefined> {
    const cacheable = await this.db.get<Cacheable<OsuUserSnapshot>>(
      `SELECT * FROM ${this.tableName} WHERE username = ? COLLATE NOCASE AND server = ? LIMIT 1`,
      [key.username, key.server]
    );
    if (cacheable === undefined) {
      return undefined;
    }
    if (Date.now() >= cacheable.expires_at) {
      await this.delete(cacheable as OsuUserSnapshot);
      return undefined;
    }
    return cacheable as OsuUserSnapshot;
  }
  async add(value: OsuUserSnapshot): Promise<OperationExecutionResult> {
    const now = Date.now();
    const expireTimeMillis = new Timespan()
      .addHours(this.expireTimeHours)
      .totalMiliseconds();
    return await this.db.run(
      `INSERT INTO ${this.tableName} (username, server, id, preferred_mode, creation_time, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        value.username,
        value.server,
        value.id,
        value.preferred_mode,
        now,
        now + expireTimeMillis,
      ]
    );
  }
  async update(value: OsuUserSnapshot): Promise<OperationExecutionResult> {
    return await this.db.run(
      `UPDATE ${this.tableName} SET id = ?, preferred_mode = ? WHERE username = ? COLLATE NOCASE AND server = ?`,
      [value.id, value.preferred_mode, value.username, value.server]
    );
  }
  async delete(key: OsuUserSnapshotKey): Promise<OperationExecutionResult> {
    return await this.db.run(
      `DELETE FROM ${this.tableName} WHERE username = ? COLLATE NOCASE AND server = ?`,
      [key.username, key.server]
    );
  }
}
