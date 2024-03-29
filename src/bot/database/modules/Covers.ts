import {BeatmapCoverDbObject} from '../Entities';
import {DbModule} from '../DbModule';
import {Result} from '../../../primitives/Result';
import {Db} from '../Db';

export class Covers extends DbModule<BeatmapCoverDbObject> {
  constructor(parentDb: Db) {
    super(parentDb, 'covers');
  }

  async init(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS covers (id INTEGER, attachment TEXT)'
    );
  }

  async add(value: BeatmapCoverDbObject): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO covers (id, attachment) VALUES (?, ?)',
      [value.id, value.attachment]
    );
  }

  update(value: BeatmapCoverDbObject): Promise<void> {
    throw new Error('Method not implemented.');
  }

  delete(value: BeatmapCoverDbObject): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
