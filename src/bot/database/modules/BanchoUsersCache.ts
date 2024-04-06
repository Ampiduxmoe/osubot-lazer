import {CachedUserDbObject} from '../Entities';
import {DbModule} from '../DbModule';
import {BotDb} from '../BotDb';

export class BanchoUsersCache extends DbModule<CachedUserDbObject> {
  private readonly expireTimeDays = 7;

  constructor(parentDb: BotDb) {
    super(parentDb, 'bancho_users_cache');
  }

  async createTable(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS bancho_users_cache (osu_id INTEGER, username TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)'
    );
  }

  override async get(
    stmt: string,
    opts?: unknown[]
  ): Promise<CachedUserDbObject | undefined> {
    const result = await this.parentDb.get<CachedUserDbObject>(stmt, opts);
    if (result === undefined) {
      return result;
    }
    let timestampString = result.timestamp!;
    if (!timestampString.endsWith('Z')) {
      timestampString += 'Z';
    }
    const expireDate = new Date(Date.parse(timestampString));
    expireDate.setDate(expireDate.getDate() + this.expireTimeDays);
    const now = Date.now();
    if (now > expireDate.valueOf()) {
      console.log(
        `Cached value of ${JSON.stringify(result)} has expired, deleting...`
      );
      await this.delete(result);
      return undefined;
    }
    return result;
  }

  async getById(osu_id: number): Promise<CachedUserDbObject | undefined> {
    return await this.get(
      'SELECT * FROM bancho_users_cache WHERE osu_id = ? LIMIT 1',
      [osu_id]
    );
  }

  async getByUsername(
    username: string
  ): Promise<CachedUserDbObject | undefined> {
    return await this.get(
      'SELECT * FROM bancho_users_cache WHERE username = ? COLLATE NOCASE LIMIT 1',
      [username]
    );
  }

  async add(value: CachedUserDbObject): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO bancho_users_cache (osu_id, username) VALUES (?, ?)',
      [value.osu_id, value.username]
    );
  }

  async update(value: CachedUserDbObject): Promise<void> {
    await this.parentDb.run(
      'UPDATE bancho_users_cache SET username = ? WHERE osu_id = ?',
      [value.username, value.osu_id]
    );
  }

  async delete(value: CachedUserDbObject): Promise<void> {
    await this.parentDb.run('DELETE FROM bancho_users_cache WHERE osu_id = ?', [
      value.osu_id,
    ]);
  }
}
