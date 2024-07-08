import {SqlDbTable} from '../SqlDbTable';
import {
  SerializedObject,
  SerializedObjectKey,
} from '../../../repository/models/SerializedObject';
import {SerializationDescriptor} from '../../../../../primitives/SerializationDescriptor';
import {SerializedObjectsRepository} from '../../../repository/repositories/SerializedObjectsRepository';

export class SerializedObjectsTable
  extends SqlDbTable
  implements SerializedObjectsRepository
{
  tableName = 'serialized_objects';

  private selectModelFields = `

SELECT
  key,
  data
    
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  key TEXT,
  data TEXT
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(key: SerializedObjectKey): Promise<SerializedObject | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  key = ?
LIMIT 1

    `.trim();
    return await this.db.get(query, [key.key]);
  }

  async add(value: SerializedObject): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  key,
  data
) VALUES (?, ?)

    `.trim();
    await this.db.run(query, [value.key, value.data]);
  }

  async update(value: SerializedObject): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  data = ?
WHERE
  key = ?

    `.trim();
    await this.db.run(query, [value.data, value.key]);
  }

  async delete(key: SerializedObjectKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  key = ?

    `.trim();
    await this.db.run(query, [key.key]);
  }

  async validateAndGet<T>(
    descriptor: SerializationDescriptor<T>
  ): Promise<T | undefined> {
    const serializedObject = await this.get({key: descriptor.key});
    if (serializedObject === undefined) {
      return undefined;
    }
    const obj = descriptor.deserialize(serializedObject.data);
    if (obj === undefined) {
      await this.add({
        key: `<INVALID_GET> ${serializedObject.key}`,
        data: serializedObject.data,
      });
      await this.delete(serializedObject);
    }
    return obj;
  }

  async save<T>(o: T, descriptor: SerializationDescriptor<T>): Promise<void> {
    const newObject: SerializedObject = {
      key: descriptor.key,
      data: descriptor.serialize(o),
    };
    const oldObject = await this.get({key: descriptor.key});
    if (oldObject === undefined) {
      await this.add(newObject);
      return;
    }
    await this.update(newObject);
  }
}
