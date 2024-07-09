import {
  VkChatLastBeatmap,
  VkChatLastBeatmapKey,
} from '../models/VkChatLastBeatmap';
import {Repository} from '../../../data/repository/Repository';
import {SqlDbTable} from '../../../data/persistence/db/SqlDbTable';
import {OsuServer} from '../../../../primitives/OsuServer';

export interface VkChatLastBeatmapsRepository
  extends Repository<VkChatLastBeatmapKey, VkChatLastBeatmap> {
  save(peerId: number, server: OsuServer, beatmapId: number): Promise<void>;
}

export class VkChatLastBeatmapsTable
  extends SqlDbTable
  implements VkChatLastBeatmapsRepository
{
  tableName = 'vk_chat_last_beatmaps';

  private selectModelFields = `

SELECT
  peer_id as peerId,
  server,
  beatmap_id as beatmapId
    
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  peer_id INTEGER,
  server INTEGER,
  beatmap_id INTEGER
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(key: VkChatLastBeatmapKey): Promise<VkChatLastBeatmap | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  peer_id = ? AND
  server = ?
LIMIT 1

    `.trim();
    return await this.db.get(query, [key.peerId, key.server]);
  }

  async add(value: VkChatLastBeatmap): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  peer_id,
  server,
  beatmap_id
) VALUES (?, ?, ?)

    `.trim();
    await this.db.run(query, [value.peerId, value.server, value.beatmapId]);
  }

  async update(value: VkChatLastBeatmap): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  beatmap_id = ?
WHERE 
  peer_id = ? AND
  server = ?

    `.trim();
    await this.db.run(query, [value.beatmapId, value.peerId, value.server]);
  }

  async delete(key: VkChatLastBeatmapKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  peer_id = ? AND
  server = ?

    `.trim();
    await this.db.run(query, [key.peerId, key.server]);
  }

  async save(
    peerId: number,
    server: OsuServer,
    beatmapId: number
  ): Promise<void> {
    const newRemember: VkChatLastBeatmap = {
      peerId: peerId,
      server: server,
      beatmapId: beatmapId,
    };
    if ((await this.get(newRemember as VkChatLastBeatmapKey)) !== undefined) {
      await this.update(newRemember);
      return;
    }
    await this.add(newRemember);
  }
}
