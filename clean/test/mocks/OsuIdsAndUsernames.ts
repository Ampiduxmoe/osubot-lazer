import {OperationExecutionResult} from '../../src/main/data/raw/db/SqlDb';
import {
  OsuIdAndUsernameKey,
  OsuIdAndUsername,
} from '../../src/main/data/raw/db/entities/OsuIdAndUsername';
import {OsuIdsAndUsernames} from '../../src/main/data/raw/db/tables/OsuIdsAndUsernames';

export class FakeOsuIdsAndUsernames extends OsuIdsAndUsernames {
  private idsAndUsernames: OsuIdAndUsername[] = [];
  async createTable(): Promise<OperationExecutionResult> {
    return {isSuccess: true};
  }
  async get(key: OsuIdAndUsernameKey): Promise<OsuIdAndUsername | undefined> {
    return this.idsAndUsernames.find(
      x => key.server === x.server && key.username === x.username
    );
  }
  async add(value: OsuIdAndUsername): Promise<OperationExecutionResult> {
    this.idsAndUsernames.push(value);
    return {isSuccess: true};
  }
  async update(value: OsuIdAndUsername): Promise<OperationExecutionResult> {
    this.delete(value as OsuIdAndUsernameKey);
    await this.add(value);
    return {isSuccess: true};
  }
  async delete(key: OsuIdAndUsernameKey): Promise<OperationExecutionResult> {
    this.idsAndUsernames.filter(
      x => !(key.server === x.server && key.username === x.username)
    );
    return {isSuccess: true};
  }
}
