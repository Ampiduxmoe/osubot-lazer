import {SqlDbTable} from '../SqlDbTable';
import {TimeWindow, TimeWindowKey} from '../../../repository/models/TimeWindow';
import {TimeWindowsRepository} from '../../../repository/repositories/TimeWindowsRepository';

export class TimeWindowsTable
  extends SqlDbTable
  implements TimeWindowsRepository
{
  tableName = 'time_windows';

  private selectModelFields = `

SELECT
  id,
  start_time as startTime,
  end_time as endTime
    
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  id INTEGER PRIMARY KEY,
  start_time INTEGER,
  end_time INTEGER
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(key: TimeWindowKey): Promise<TimeWindow | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  id = ?
LIMIT 1

    `.trim();
    return await this.db.get(query, [key.id]);
  }

  async add(value: TimeWindow): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  id,
  start_time,
  end_time
) VALUES (?, ?, ?)

    `.trim();
    await this.db.run(query, [value.id, value.startTime, value.endTime]);
  }

  async update(value: TimeWindow): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  start_time = ?,
  end_time = ?
WHERE
  id = ?

    `.trim();
    await this.db.run(query, [value.startTime, value.endTime, value.id]);
  }

  async delete(key: TimeWindowKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  id = ?

    `.trim();
    await this.db.run(query, [key.id]);
  }

  async getAllByIds(ids: number[]): Promise<TimeWindow[]> {
    const idPlaceholders = ids.map(() => '?').join(',');
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  id in (${idPlaceholders})

    `.trim();
    return await this.db.getAll(query, ids);
  }

  async getAllByTimeInterval(
    start_time: number,
    end_time: number
  ): Promise<TimeWindow[]> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  start_time >= ? AND
  end_time <= ?

    `.trim();
    return await this.db.getAll(query, [start_time, end_time]);
  }

  async addWithoutId(value: TimeWindow): Promise<TimeWindow> {
    const query = `

INSERT INTO ${this.tableName} (
  start_time,
  end_time
) VALUES (?, ?)

    `.trim();
    const result = await this.db.run(query, [value.startTime, value.endTime]);
    const newValue = Object.assign({}, value);
    newValue.id = result.lastInsertRowId;
    return newValue;
  }

  async addAllWithoutIds(values: TimeWindow[]): Promise<TimeWindow[]> {
    const valuePlaceholdersString = values.map(() => '(?, ?)').join(', ');
    const valuesUnwrapped = values.map(x => [x.startTime, x.endTime]).flat();
    const query = `

INSERT INTO ${this.tableName} (
  start_time,
  end_time
) VALUES ${valuePlaceholdersString}

    `.trim();
    const result = await this.db.run(query, valuesUnwrapped);
    const newValues = values.map((x, i) => {
      const newX = Object.assign({}, x);
      newX.id = result.lastInsertRowId - values.length + i + 1;
      return newX;
    });
    return newValues;
  }

  async deleteAll(keys: TimeWindowKey[]): Promise<void> {
    const idPlaceholders = keys.map(() => '?').join(',');
    const ids = keys.map(x => x.id);
    const query = `

DELETE FROM ${this.tableName}
WHERE
  id in (${idPlaceholders})

    `.trim();
    await this.db.run(query, ids);
  }
}
