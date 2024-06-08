import {OperationExecutionResult} from '../SqlDb';
import {SqlDbTable} from '../SqlDbTable';
import {JsonObject, JsonObjectKey} from '../entities/JsonObject';
import {JsonCacheDescriptor} from '../../../../../primitives/JsonCacheDescriptor';

export abstract class JsonObjects extends SqlDbTable<
  JsonObjectKey,
  JsonObject
> {
  tableName = 'json_objects';

  abstract validateAndGet<T>(
    descriptor: JsonCacheDescriptor<T>
  ): Promise<T | undefined>;

  abstract save<T>(o: T, descriptor: JsonCacheDescriptor<T>): Promise<void>;
}

export class JsonObjectsImpl extends JsonObjects {
  async createTable(): Promise<OperationExecutionResult> {
    return await this.db.run(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (json_key TEXT, json_string TEXT)`,
      []
    );
  }
  async get(key: JsonObjectKey): Promise<JsonObject | undefined> {
    return await this.db.get(
      `SELECT * FROM ${this.tableName} WHERE json_key = ? LIMIT 1`,
      [key.json_key]
    );
  }
  async add(value: JsonObject): Promise<OperationExecutionResult> {
    return await this.db.run(
      `INSERT INTO ${this.tableName} (json_key, json_string) VALUES (?, ?)`,
      [value.json_key, value.json_string]
    );
  }
  async update(value: JsonObject): Promise<OperationExecutionResult> {
    return await this.db.run(
      `UPDATE ${this.tableName} SET json_string = ? WHERE json_key = ?`,
      [value.json_string, value.json_key]
    );
  }
  async delete(key: JsonObjectKey): Promise<OperationExecutionResult> {
    return await this.db.run(
      `DELETE FROM ${this.tableName} WHERE json_key = ?`,
      [key.json_key]
    );
  }
  async validateAndGet<T>(
    descriptor: JsonCacheDescriptor<T>
  ): Promise<T | undefined> {
    const jsonObject = await this.get({json_key: descriptor.key});
    if (jsonObject === undefined) {
      return undefined;
    }
    const obj = descriptor.deserialize(jsonObject.json_string);
    if (obj === undefined) {
      await this.add({
        json_key: `<INVALID_GET> ${jsonObject.json_key}`,
        json_string: jsonObject.json_string,
      });
      await this.delete(jsonObject);
    }
    return obj;
  }
  async save<T>(o: T, descriptor: JsonCacheDescriptor<T>): Promise<void> {
    const newObject: JsonObject = {
      json_key: descriptor.key,
      json_string: descriptor.serialize(o),
    };
    const oldObject = await this.get({json_key: descriptor.key});
    if (oldObject === undefined) {
      await this.add(newObject);
      return;
    }
    await this.update(newObject);
  }
}
