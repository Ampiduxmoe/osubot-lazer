import {BeatmapCoverDbObject} from '../Entities';
import {DbModule} from '../DbModule';
import {BotDb} from '../BotDb';

export class Covers extends DbModule<BeatmapCoverDbObject> {
  constructor(parentDb: BotDb) {
    super(parentDb, 'covers');
  }

  async createTable(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS covers (beatmapset_id INTEGER, attachment TEXT)'
    );
  }

  async getById(
    beatmapset_id: number
  ): Promise<BeatmapCoverDbObject | undefined> {
    return await this.get(
      'SELECT * FROM covers WHERE beatmapset_id = ? LIMIT 1',
      [beatmapset_id]
    );
  }

  async add(value: BeatmapCoverDbObject): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO covers (beatmapset_id, attachment) VALUES (?, ?)',
      [value.beatmapset_id, value.attachment]
    );
  }

  async update(value: BeatmapCoverDbObject): Promise<void> {
    await this.parentDb.run(
      'UPDATE covers SET attachment = ? WHERE beatmapset_id = ?',
      [value.attachment, value.beatmapset_id]
    );
  }

  async delete(value: BeatmapCoverDbObject): Promise<void> {
    await this.parentDb.run('DELETE FROM covers WHERE beatmapset_id = ?', [
      value.beatmapset_id,
    ]);
  }
}
