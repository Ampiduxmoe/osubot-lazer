import {
  UnreadMessage,
  UnreadMessageKey,
} from '../../../repository/models/UnreadMessage';
import {UnreadMessagesRepository} from '../../../repository/repositories/UnreadMessagesRepository';
import {SqlDbTable} from '../SqlDbTable';

export class UnreadMessagesTable
  extends SqlDbTable
  implements UnreadMessagesRepository
{
  tableName = 'unread_messages';

  private selectModelFields = `

SELECT
  app_user_id as appUserId,
  message_id as messageId,
  text
  
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  app_user_id TEXT,
  message_id TEXT,
  text TEXT
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(key: UnreadMessageKey): Promise<UnreadMessage | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  app_user_id = ?
LIMIT 1

    `.trim();
    return await this.db.get(query, [key.appUserId]);
  }

  async add(value: UnreadMessage): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  app_user_id,
  message_id,
  text
) VALUES (?, ?, ?)

    `.trim();
    await this.db.run(query, [value.appUserId, value.messageId, value.text]);
  }

  async update(value: UnreadMessage): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  message_id = ?,
  text = ?
WHERE 
  app_user_id = ?

    `.trim();
    await this.db.run(query, [value.messageId, value.text, value.appUserId]);
  }

  async delete(key: UnreadMessageKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  app_user_id = ?

    `.trim();
    await this.db.run(query, [key.appUserId]);
  }
}
