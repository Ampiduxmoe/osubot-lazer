import {CachedBeatmapsetDbObject} from '../Entities';
import {DbModule} from '../DbModule';
import {BotDb} from '../BotDb';

export class BanchoBeatmapsetsCache extends DbModule<CachedBeatmapsetDbObject> {
  private readonly expireTimeDays = 28;

  constructor(parentDb: BotDb) {
    super(parentDb, 'bancho_beatmapsets_cache');
  }

  async createTable(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS bancho_beatmapsets_cache (beatmapset_id INTEGER, artist TEXT, title TEXT, creator TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)'
    );
  }

  override async get(
    stmt: string,
    opts?: unknown[]
  ): Promise<CachedBeatmapsetDbObject | undefined> {
    const result = await this.parentDb.get<CachedBeatmapsetDbObject>(
      stmt,
      opts
    );
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

  async getById(
    beatmapset_id: number
  ): Promise<CachedBeatmapsetDbObject | undefined> {
    return await this.get(
      'SELECT * FROM bancho_beatmapsets_cache WHERE beatmapset_id = ? LIMIT 1',
      [beatmapset_id]
    );
  }

  async add(value: CachedBeatmapsetDbObject): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO bancho_beatmapsets_cache (beatmapset_id, artist, title, creator) VALUES (?, ?, ?, ?)',
      [value.beatmapset_id, value.artist, value.title, value.creator]
    );
  }

  async update(value: CachedBeatmapsetDbObject): Promise<void> {
    await this.parentDb.run(
      'UPDATE bancho_beatmapsets_cache SET artist = ?, title = ?, creator = ? WHERE beatmapset_id = ?',
      [value.artist, value.title, value.creator, value.beatmapset_id]
    );
  }

  async delete(value: CachedBeatmapsetDbObject): Promise<void> {
    await this.parentDb.run(
      'DELETE FROM bancho_beatmapsets_cache WHERE beatmapset_id = ?',
      [value.beatmapset_id]
    );
  }
}
