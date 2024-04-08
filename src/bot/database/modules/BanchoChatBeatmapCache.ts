import {CachedChatBeatmapDbObject} from '../Entities';
import {DbModule} from '../DbModule';
import {BotDb} from '../BotDb';

export class BanchoChatBeatmapCache extends DbModule<CachedChatBeatmapDbObject> {
  constructor(parentDb: BotDb) {
    super(parentDb, 'bancho_chat_beatmap_cache');
  }

  async createTable(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS bancho_chat_beatmap_cache (peer_id INTEGER, beatmap_id INTEGER)'
    );
  }

  async getById(
    peer_id: number
  ): Promise<CachedChatBeatmapDbObject | undefined> {
    return await this.get(
      'SELECT * FROM bancho_chat_beatmap_cache WHERE peer_id = ? LIMIT 1',
      [peer_id]
    );
  }

  async add(value: CachedChatBeatmapDbObject): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO bancho_chat_beatmap_cache (peer_id, beatmap_id) VALUES (?, ?)',
      [value.peer_id, value.beatmap_id]
    );
  }

  async update(value: CachedChatBeatmapDbObject): Promise<void> {
    await this.parentDb.run(
      'UPDATE bancho_chat_beatmap_cache SET beatmap_id = ? WHERE peer_id = ?',
      [value.beatmap_id, value.peer_id]
    );
  }

  async delete(value: CachedChatBeatmapDbObject): Promise<void> {
    await this.parentDb.run(
      'DELETE FROM bancho_chat_beatmap_cache WHERE peer_id = ?',
      [value.peer_id]
    );
  }
}
