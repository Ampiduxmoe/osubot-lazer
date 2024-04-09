import {UsernameDecorationDbObject} from '../Entities';
import {DbModule} from '../DbModule';
import {BotDb} from '../BotDb';

export class UsernameDecorations extends DbModule<UsernameDecorationDbObject> {
  constructor(parentDb: BotDb) {
    super(parentDb, 'username_decorations');
  }

  async createTable(): Promise<void> {
    await this.parentDb.run(
      'CREATE TABLE IF NOT EXISTS username_decorations (username TEXT, pattern TEXT)'
    );
  }

  async getByUsername(
    username: string
  ): Promise<UsernameDecorationDbObject | undefined> {
    return await this.get(
      'SELECT * FROM username_decorations WHERE username = ? COLLATE NOCASE LIMIT 1',
      [username]
    );
  }

  async add(value: UsernameDecorationDbObject): Promise<void> {
    await this.parentDb.run(
      'INSERT INTO username_decorations (username, pattern) VALUES (?, ?)',
      [value.username, value.pattern]
    );
  }

  async update(value: UsernameDecorationDbObject): Promise<void> {
    await this.parentDb.run(
      'UPDATE username_decorations SET pattern = ? WHERE username = ?',
      [value.pattern, value.username]
    );
  }

  async delete(value: UsernameDecorationDbObject): Promise<void> {
    await this.parentDb.run(
      'DELETE FROM username_decorations WHERE username = ? COLLATE NOCASE',
      [value.username]
    );
  }
}
