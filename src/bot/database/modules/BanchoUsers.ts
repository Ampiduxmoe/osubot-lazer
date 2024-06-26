import {UserDbObject} from '../Entities';
import {DbModule} from '../DbModule';
import {BotDb} from '../BotDb';

export class BanchoUsers extends DbModule<UserDbObject> {
  constructor(parentDb: BotDb) {
    super(parentDb, 'bancho_users');
  }

  async createTable(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS bancho_users (vk_id INTEGER, osu_id INTEGER, username TEXT, mode INTEGER)'
    );
  }

  async getById(vk_id: number): Promise<UserDbObject | undefined> {
    return await this.get(
      'SELECT * FROM bancho_users WHERE vk_id = ? LIMIT 1',
      [vk_id]
    );
  }

  async getByUsername(username: string): Promise<UserDbObject | undefined> {
    return await this.get(
      'SELECT * FROM bancho_users WHERE username = ? COLLATE NOCASE LIMIT 1',
      [username]
    );
  }

  async add(value: UserDbObject): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO bancho_users (vk_id, osu_id, username, mode) VALUES (?, ?, ?, ?)',
      [value.vk_id, value.osu_id, value.username, value.mode]
    );
  }

  async update(value: UserDbObject): Promise<void> {
    await this.parentDb.run(
      'UPDATE bancho_users SET osu_id = ?, username = ?, mode = ? WHERE vk_id = ?',
      [value.osu_id, value.username, value.mode, value.vk_id]
    );
  }

  async delete(value: UserDbObject): Promise<void> {
    await this.parentDb.run('DELETE FROM bancho_users WHERE vk_id = ?', [
      value.vk_id,
    ]);
  }
}
