import {OsuUserLight} from '../Entities';
import {DbModule} from '../DbModule';
import {BotDb} from '../BotDb';

export class BanchoCache extends DbModule<OsuUserLight> {
  constructor(parentDb: BotDb) {
    super(parentDb, 'bancho_cache');
  }

  async createTable(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS bancho_cache (osu_id INTEGER, username TEXT)'
    );
  }

  async getById(osu_id: number): Promise<OsuUserLight | undefined> {
    return await this.get(
      'SELECT * FROM bancho_cache WHERE osu_id = ? LIMIT 1',
      [osu_id]
    );
  }

  async getByUsername(username: string): Promise<OsuUserLight | undefined> {
    return await this.get(
      'SELECT * FROM bancho_cache WHERE username = ? COLLATE NOCASE LIMIT 1',
      [username]
    );
  }

  async add(value: OsuUserLight): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO bancho_cache (osu_id, username) VALUES (?, ?)',
      [value.osu_id, value.username]
    );
  }

  async update(value: OsuUserLight): Promise<void> {
    await this.parentDb.run(
      'UPDATE bancho_cache SET username = ? WHERE osu_id = ?',
      [value.username, value.osu_id]
    );
  }

  async delete(value: OsuUserLight): Promise<void> {
    await this.parentDb.run('DELETE FROM bancho_cache WHERE osu_id = ?', [
      value.osu_id,
    ]);
  }
}
