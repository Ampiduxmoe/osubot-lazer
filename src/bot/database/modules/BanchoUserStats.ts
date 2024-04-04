import {UserStatsDbObject} from '../Entities';
import {DbModule} from '../DbModule';
import {BotDb} from '../BotDb';

export class BanchoUserStats extends DbModule<UserStatsDbObject> {
  constructor(parentDb: BotDb) {
    super(parentDb, 'bancho_user_stats');
  }

  async createTable(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS bancho_user_stats (osu_id INTEGER, username TEXT, pp REAL, rank INTEGER, accuracy REAL)'
    );
  }

  async getById(osu_id: number): Promise<UserStatsDbObject | undefined> {
    return await this.get(
      'SELECT * FROM bancho_user_stats WHERE osu_id = ? LIMIT 1',
      [osu_id]
    );
  }

  async getByUsername(
    username: string
  ): Promise<UserStatsDbObject | undefined> {
    return await this.get(
      'SELECT * FROM bancho_user_stats WHERE username = ? COLLATE NOCASE LIMIT 1',
      [username]
    );
  }

  async add(value: UserStatsDbObject): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO bancho_user_stats (osu_id, username, pp, rank, accuracy) VALUES (?, ?, ?, ?, ?)',
      [value.osu_id, value.username, value.pp, value.rank, value.accuracy]
    );
  }

  async update(value: UserStatsDbObject): Promise<void> {
    await this.parentDb.run(
      'UPDATE bancho_user_stats SET username = ?, pp = ?, rank = ?, accuracy = ? WHERE osu_id = ?',
      [value.username, value.pp, value.rank, value.accuracy, value.osu_id]
    );
  }

  async delete(value: UserStatsDbObject): Promise<void> {
    await this.parentDb.run('DELETE FROM bancho_user_stats WHERE osu_id = ?', [
      value.osu_id,
    ]);
  }
}
