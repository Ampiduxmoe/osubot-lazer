import {SqlDbTable} from '../SqlDbTable';
import {
  OsuUserSnapshot,
  OsuUserSnapshotKey,
} from '../../../repository/models/OsuUserSnapshot';
import {Cacheable} from '../entities/Cacheable';
import {Timespan} from '../../../../../primitives/Timespan';
import {OsuUserSnapshotsRepository} from '../../../repository/repositories/OsuUserSnapshotsRepository';

export class OsuUserSnapshotsTable
  extends SqlDbTable
  implements OsuUserSnapshotsRepository
{
  tableName = 'osu_user_snapshots';

  readonly expireTimeHours: number = 24;

  private selectModelFields = `

SELECT
  username,
  server,
  id,
  preferred_mode as preferredMode
    
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  username TEXT,
  server INTEGER,
  id INTEGER,
  preferred_mode INTEGER,
  creation_time INTEGER,
  expires_at INTEGER
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(key: OsuUserSnapshotKey): Promise<OsuUserSnapshot | undefined> {
    const query = `

${this.selectModelFields},
  creation_time,
  expires_at
FROM ${this.tableName}
WHERE
  username = ? COLLATE NOCASE AND
  server = ?
LIMIT 1

    `.trim();
    const cacheable = await this.db.get<Cacheable<OsuUserSnapshot>>(query, [
      key.username,
      key.server,
    ]);
    if (cacheable === undefined) {
      return undefined;
    }
    if (Date.now() >= cacheable.expires_at) {
      await this.delete(cacheable as OsuUserSnapshotKey);
      return undefined;
    }
    return cacheable as OsuUserSnapshot;
  }

  async add(value: OsuUserSnapshot): Promise<void> {
    const now = Date.now();
    const expireTimeMillis = new Timespan()
      .addHours(this.expireTimeHours)
      .totalMiliseconds();
    const query = `

INSERT INTO ${this.tableName} (
  username,
  server,
  id,
  preferred_mode,
  creation_time,
  expires_at
) VALUES (?, ?, ?, ?, ?, ?)

    `.trim();
    await this.db.run(query, [
      value.username,
      value.server,
      value.id,
      value.preferredMode,
      now,
      now + expireTimeMillis,
    ]);
  }

  async update(value: OsuUserSnapshot): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  id = ?,
  preferred_mode = ?
WHERE
  username = ? COLLATE NOCASE AND
  server = ?

    `.trim();
    await this.db.run(query, [
      value.id,
      value.preferredMode,
      value.username,
      value.server,
    ]);
  }

  async delete(key: OsuUserSnapshotKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  username = ? COLLATE NOCASE AND
  server = ?

    `.trim();
    await this.db.run(query, [key.username, key.server]);
  }
}
