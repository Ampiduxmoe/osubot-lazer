import {Anouncement, AnouncementKey} from '../models/Anouncement';
import {Repository} from '../../../data/repository/Repository';
import {SqlDbTable} from '../../../data/persistence/db/SqlDbTable';

export interface AnouncementsRepository
  extends Repository<AnouncementKey, Anouncement> {
  addWithoutId(value: Anouncement): Promise<Anouncement>;
  getManyByIdRange(startId: number, endId: number): Promise<Anouncement[]>;
  getLastAnouncements(count: number): Promise<Anouncement[]>;
}

export class AnouncementsTable
  extends SqlDbTable
  implements AnouncementsRepository
{
  tableName = 'anouncements';

  private selectModelFields = `

SELECT
  id,
  description,
  text
    
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  id INTEGER PRIMARY KEY,
  description TEXT,
  text TEXT
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(key: AnouncementKey): Promise<Anouncement | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  id = ?
LIMIT 1

    `.trim();
    return await this.db.get(query, [key.id]);
  }

  async add(value: Anouncement): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  id,
  description,
  text
) VALUES (?, ?, ?)

    `.trim();
    await this.db.run(query, [value.id, value.description, value.text]);
  }

  async update(value: Anouncement): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  description = ?,
  text = ?
WHERE 
  id = ?

    `.trim();
    await this.db.run(query, [value.description, value.text, value.id]);
  }

  async delete(key: AnouncementKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  id = ?

    `.trim();
    await this.db.run(query, [key.id]);
  }

  async addWithoutId(value: Anouncement): Promise<Anouncement> {
    const query = `

INSERT INTO ${this.tableName} (
  description,
  text
) VALUES (?, ?)

    `.trim();
    const result = await this.db.run(query, [value.description, value.text]);
    const newValue = Object.assign({}, value);
    newValue.id = result.lastInsertRowId;
    return newValue;
  }

  async getManyByIdRange(
    startId: number,
    endId: number
  ): Promise<Anouncement[]> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  id >= ? AND
  id <= ?

    `.trim();
    return await this.db.getAll(query, [startId, endId]);
  }

  async getLastAnouncements(count: number): Promise<Anouncement[]> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
ORDER BY id DESC
LIMIT ?

    `.trim();
    return await this.db.getAll(query, [count]);
  }
}
