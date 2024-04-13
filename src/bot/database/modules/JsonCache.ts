import {CachedJsonDbObject} from '../Entities';
import {DbModule} from '../DbModule';
import {BotDb} from '../BotDb';

export class JsonCache extends DbModule<CachedJsonDbObject> {
  constructor(parentDb: BotDb) {
    super(parentDb, 'json_cache');
  }

  async createTable(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS json_cache (object_name TEXT, json_string TEXT)'
    );
  }

  async getByName(
    object_name: string
  ): Promise<CachedJsonDbObject | undefined> {
    return await this.get(
      'SELECT * FROM json_cache WHERE object_name = ? LIMIT 1',
      [object_name]
    );
  }

  async validateAndGet<T>(
    params: JsonCacheValidateAndGetParams<T>
  ): Promise<T | undefined> {
    const cachedJsonObject = await this.getByName(params.object_name);
    if (cachedJsonObject === undefined) {
      return undefined;
    }
    const value: T = JSON.parse(cachedJsonObject.json_string);
    if (!params.validate(value)) {
      await this.delete(cachedJsonObject);
      return undefined;
    }
    return value;
  }

  async add(value: CachedJsonDbObject): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO json_cache (object_name, json_string) VALUES (?, ?)',
      [value.object_name, value.json_string]
    );
  }

  async update(value: CachedJsonDbObject): Promise<void> {
    await this.parentDb.run(
      'UPDATE json_cache SET json_string = ? WHERE object_name = ?',
      [value.json_string, value.object_name]
    );
  }

  async delete(value: CachedJsonDbObject): Promise<void> {
    await this.parentDb.run('DELETE FROM json_cache WHERE object_name = ?', [
      value.object_name,
    ]);
  }
}

interface JsonCacheValidateAndGetParams<T> {
  object_name: string;
  validate: (value: T) => boolean;
}

export const OSU_OAUTH_TOKEN_ID = 'osu_oauth_token';
