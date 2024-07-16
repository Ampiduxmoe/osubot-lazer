import {PastAnouncement, PastAnouncementKey} from '../models/PastAnouncement';
import {Repository} from '../../../data/repository/Repository';
import {SqlDbTable} from '../../../data/persistence/db/SqlDbTable';

export interface PastAnouncementsRepository
  extends Repository<PastAnouncementKey, PastAnouncement> {
  addWithoutId(value: PastAnouncement): Promise<PastAnouncement>;
  getManyByIdRange(startId: number, endId: number): Promise<PastAnouncement[]>;
  getManyByAnouncementId(anouncementId: number): Promise<PastAnouncement[]>;
  getLastAnouncements(count: number): Promise<PastAnouncement[]>;
}

export class PastAnouncementsTable
  extends SqlDbTable
  implements PastAnouncementsRepository
{
  tableName = 'past_anouncements';

  private selectModelFields = `

SELECT
  id,
  anouncement_id as anouncementId,
  targets,
  time
    
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  id INTEGER PRIMARY KEY,
  anouncement_id INTEGER,
  targets TEXT,
  time INTEGER
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(key: PastAnouncementKey): Promise<PastAnouncement | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  id = ?
LIMIT 1

    `.trim();
    return await this.db.get(query, [key.id]);
  }

  async add(value: PastAnouncement): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  id,
  anouncement_id,
  targets,
  time
) VALUES (?, ?, ?, ?)

    `.trim();
    await this.db.run(query, [
      value.id,
      value.anouncementId,
      value.targets,
      value.time,
    ]);
  }

  async update(value: PastAnouncement): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  anouncement_id = ?,
  targets = ?,
  time = ?
WHERE 
  id = ?

    `.trim();
    await this.db.run(query, [
      value.anouncementId,
      value.targets,
      value.time,
      value.id,
    ]);
  }

  async delete(key: PastAnouncementKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  id = ?

    `.trim();
    await this.db.run(query, [key.id]);
  }

  async addWithoutId(value: PastAnouncement): Promise<PastAnouncement> {
    const query = `

INSERT INTO ${this.tableName} (
  anouncement_id,
  targets,
  time
) VALUES (?, ?, ?)

    `.trim();
    const result = await this.db.run(query, [
      value.anouncementId,
      value.targets,
      value.time,
    ]);
    const newValue = Object.assign({}, value);
    newValue.id = result.lastInsertRowId;
    return newValue;
  }

  async getManyByIdRange(
    startId: number,
    endId: number
  ): Promise<PastAnouncement[]> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  id >= ? AND
  id <= ?

    `.trim();
    return await this.db.getAll(query, [startId, endId]);
  }

  async getManyByAnouncementId(
    anouncementId: number
  ): Promise<PastAnouncement[]> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  anouncement_id = ?

    `.trim();
    return await this.db.getAll(query, [anouncementId]);
  }

  async getLastAnouncements(count: number): Promise<PastAnouncement[]> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
ORDER BY id DESC
LIMIT ?

    `.trim();
    return await this.db.getAll(query, [count]);
  }
}
