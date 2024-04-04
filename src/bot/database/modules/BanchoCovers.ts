import {BeatmapCoverDbObject} from '../Entities';
import {DbModule} from '../DbModule';
import {BotDb} from '../BotDb';
import axios from 'axios';
import {Result} from '../../../primitives/Result';
import {catchedValueToError} from '../../../primitives/Errors';
import {VK} from 'vk-io';

export class BanchoCovers extends DbModule<BeatmapCoverDbObject> {
  constructor(parentDb: BotDb) {
    super(parentDb, 'bancho_covers');
  }

  async createTable(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS bancho_covers (beatmapset_id INTEGER, attachment TEXT)'
    );
  }

  async getById(
    beatmapset_id: number
  ): Promise<BeatmapCoverDbObject | undefined> {
    return await this.get(
      'SELECT * FROM bancho_covers WHERE beatmapset_id = ? LIMIT 1',
      [beatmapset_id]
    );
  }

  async add(value: BeatmapCoverDbObject): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO bancho_covers (beatmapset_id, attachment) VALUES (?, ?)',
      [value.beatmapset_id, value.attachment]
    );
  }

  async update(value: BeatmapCoverDbObject): Promise<void> {
    await this.parentDb.run(
      'UPDATE bancho_covers SET attachment = ? WHERE beatmapset_id = ?',
      [value.attachment, value.beatmapset_id]
    );
  }

  async delete(value: BeatmapCoverDbObject): Promise<void> {
    await this.parentDb.run(
      'DELETE FROM bancho_covers WHERE beatmapset_id = ?',
      [value.beatmapset_id]
    );
  }

  async getByIdOrDownload(
    beatmapset_id: number,
    vk: VK
  ): Promise<Result<BeatmapCoverDbObject>> {
    const cover = await this.getById(beatmapset_id);
    if (!cover) {
      return await this.downloadCover(beatmapset_id, vk);
    }
    return Result.ok(cover);
  }

  async downloadCover(
    beatmapset_id: number,
    vk: VK
  ): Promise<Result<BeatmapCoverDbObject>> {
    console.log(`Trying to download cover for ${beatmapset_id}`);
    try {
      const response = await axios.get(
        `https://assets.ppy.sh/beatmaps/${beatmapset_id}/covers/raw.jpg`,
        {
          responseType: 'arraybuffer',
          validateStatus: function () {
            return true;
          },
        }
      );
      if (response.status !== 200) {
        const errorText = `Could not fetch cover for ${beatmapset_id}: response status was ${response.status}`;
        console.log(errorText);
        return Result.fail([Error(errorText)]);
      }

      console.log(`Uploading cover for ${beatmapset_id} to VK...`);
      const photo = await vk.upload.messagePhoto({
        source: {
          value: Buffer.from(response.data),
        },
      });

      console.log(`Adding cover for ${beatmapset_id} to database...`);
      const cover: BeatmapCoverDbObject = {
        beatmapset_id: beatmapset_id,
        attachment: photo.toString(),
      };
      await this.add(cover);
      console.log(`Added cover to database: ${JSON.stringify(cover)}`);

      return Result.ok(cover);
    } catch (e) {
      const errorText = `Error: could not add cover for ${beatmapset_id}`;
      console.log(errorText);
      console.log(e);
      const internalError = catchedValueToError(e);
      const allErrors =
        internalError === undefined
          ? [Error(errorText)]
          : [Error(errorText), internalError];
      return Result.fail(allErrors);
    }
  }
}
