import {SqlDb} from '../../../data/persistence/db/SqlDb';
import {SqlDbTable} from '../../../data/persistence/db/SqlDbTable';
import {Repository} from '../../../data/repository/Repository';
import {OsuServer} from '../../../primitives/OsuServer';
import {VkBeatmapCover, VkBeatmapCoverKey} from '../models/VkBeatmapCover';

export interface VkBeatmapCoversRepository
  extends Repository<VkBeatmapCoverKey, VkBeatmapCover> {
  downloadAndSave(
    server: OsuServer,
    beatmapsetId: number,
    url: string
  ): Promise<string | undefined>;
}

export class VkBeatmapCoversTable
  extends SqlDbTable
  implements VkBeatmapCoversRepository
{
  fetchArrayBuffer: (url: string) => Promise<ArrayBuffer>;
  uploadImageToVk: (buffer: Buffer) => Promise<string>;
  verboseDownloadAndSave: boolean;
  constructor(
    db: SqlDb,
    fetchArrayBuffer: (url: string) => Promise<ArrayBuffer>,
    uploadImageToVk: (buffer: Buffer) => Promise<string>,
    verboseDownloadAndSave: boolean
  ) {
    super(db);
    this.fetchArrayBuffer = fetchArrayBuffer;
    this.uploadImageToVk = uploadImageToVk;
    this.verboseDownloadAndSave = verboseDownloadAndSave;
  }

  tableName = 'vk_beatmap_covers';

  private selectModelFields = `

SELECT
  server,
  beatmapset_id as beatmapsetId,
  attachment
    
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  server INTEGER,
  beatmapset_id INTEGER,
  attachment TEXT
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(key: VkBeatmapCoverKey): Promise<VkBeatmapCover | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  server = ? AND
  beatmapset_id = ?
LIMIT 1

    `.trim();
    return await this.db.get(query, [key.server, key.beatmapsetId]);
  }

  async add(value: VkBeatmapCover): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  server,
  beatmapset_id,
  attachment
) VALUES (?, ?, ?)

    `.trim();
    await this.db.run(query, [
      value.server,
      value.beatmapsetId,
      value.attachment,
    ]);
  }

  async update(value: VkBeatmapCover): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  attachment = ?
WHERE
  server = ? AND
  beatmapset_id = ?

    `.trim();
    await this.db.run(query, [
      value.attachment,
      value.server,
      value.beatmapsetId,
    ]);
  }

  async delete(key: VkBeatmapCoverKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  server = ? AND
  beatmapset_id = ?

    `.trim();
    await this.db.run(query, [key.server, key.beatmapsetId]);
  }

  async downloadAndSave(
    server: OsuServer,
    beatmapsetId: number,
    url: string
  ): Promise<string | undefined> {
    let data: ArrayBuffer;
    try {
      console.log(`Trying to get beatmap cover for ${beatmapsetId}`);
      const fetchStart = Date.now();
      data = await this.fetchArrayBuffer(url);
      const fetchTime = Date.now() - fetchStart;
      if (this.verboseDownloadAndSave) {
        console.log(`Fetched cover for ${beatmapsetId} in ${fetchTime}ms`);
      }
    } catch (e) {
      if (this.verboseDownloadAndSave) {
        console.log(`Could not fetch cover for ${beatmapsetId}`);
        if (e instanceof Error) {
          console.log(e.message);
        } else {
          console.log(e);
        }
      }
      return undefined;
    }

    console.log(`Trying to upload beatmap cover for ${beatmapsetId}`);
    const uploadStart = Date.now();
    const attachment = await this.uploadImageToVk(Buffer.from(data));
    const uploadTime = Date.now() - uploadStart;
    if (this.verboseDownloadAndSave) {
      console.log(
        `Uploaded cover for ${beatmapsetId} to VK in ${uploadTime}ms`
      );
    }

    await this.add({
      server: server,
      beatmapsetId: beatmapsetId,
      attachment: attachment,
    });
    return attachment;
  }
}
