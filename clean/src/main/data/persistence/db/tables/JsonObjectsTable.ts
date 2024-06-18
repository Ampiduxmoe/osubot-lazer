import {SqlDbTable} from '../SqlDbTable';
import {JsonObject, JsonObjectKey} from '../../../repository/models/JsonObject';
import {JsonCacheDescriptor} from '../../../../../primitives/JsonCacheDescriptor';
import {JsonObjectsRepository} from '../../../repository/repositories/JsonObjectsRepository';

export class JsonObjectsTable
  extends SqlDbTable
  implements JsonObjectsRepository
{
  tableName = 'json_objects';

  private selectModelFields = `

SELECT
  json_key as jsonKey,
  json_string as jsonString
    
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  json_key TEXT,
  json_string TEXT
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(key: JsonObjectKey): Promise<JsonObject | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  json_key = ?
LIMIT 1

    `.trim();
    return await this.db.get(query, [key.jsonKey]);
  }

  async add(value: JsonObject): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  json_key,
  json_string
) VALUES (?, ?)

    `.trim();
    await this.db.run(query, [value.jsonKey, value.jsonString]);
  }

  async update(value: JsonObject): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  json_string = ?
WHERE
  json_key = ?

    `.trim();
    await this.db.run(query, [value.jsonString, value.jsonKey]);
  }

  async delete(key: JsonObjectKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  json_key = ?

    `.trim();
    await this.db.run(query, [key.jsonKey]);
  }

  async validateAndGet<T>(
    descriptor: JsonCacheDescriptor<T>
  ): Promise<T | undefined> {
    const jsonObject = await this.get({jsonKey: descriptor.key});
    if (jsonObject === undefined) {
      return undefined;
    }
    const obj = descriptor.deserialize(jsonObject.jsonString);
    if (obj === undefined) {
      await this.add({
        jsonKey: `<INVALID_GET> ${jsonObject.jsonKey}`,
        jsonString: jsonObject.jsonString,
      });
      await this.delete(jsonObject);
    }
    return obj;
  }

  async save<T>(o: T, descriptor: JsonCacheDescriptor<T>): Promise<void> {
    const newObject: JsonObject = {
      jsonKey: descriptor.key,
      jsonString: descriptor.serialize(o),
    };
    const oldObject = await this.get({jsonKey: descriptor.key});
    if (oldObject === undefined) {
      await this.add(newObject);
      return;
    }
    await this.update(newObject);
  }
}
