import {SqlDbTable} from '../SqlDbTable';
import {AppUser, AppUserKey} from '../../../repository/models/AppUser';
import {AppUsersRepository} from '../../../repository/repositories/AppUsersRepository';

export class AppUsersTable extends SqlDbTable implements AppUsersRepository {
  tableName = 'app_users';

  private selectModelFields = `

SELECT
  id,
  server,
  osu_id as osuId,
  username,
  ruleset
  
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  id TEXT,
  server INTEGER,
  osu_id INTEGER,
  username TEXT,
  ruleset INTEGER
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(key: AppUserKey): Promise<AppUser | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  id = ? AND
  server = ?
LIMIT 1

    `.trim();
    return await this.db.get(query, [key.id, key.server]);
  }

  async add(value: AppUser): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  id,
  server,
  osu_id,
  username,
  ruleset
) VALUES (?, ?, ?, ?, ?)

    `.trim();
    await this.db.run(query, [
      value.id,
      value.server,
      value.osuId,
      value.username,
      value.ruleset,
    ]);
  }

  async update(value: AppUser): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  osu_id = ?,
  username = ?,
  ruleset = ?
WHERE 
  id = ? AND
  server = ?

    `.trim();
    await this.db.run(query, [
      value.osuId,
      value.username,
      value.ruleset,
      value.id,
      value.server,
    ]);
  }

  async delete(key: AppUserKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  id = ? AND
  server = ?

    `.trim();
    await this.db.run(query, [key.id, key.server]);
  }
}
