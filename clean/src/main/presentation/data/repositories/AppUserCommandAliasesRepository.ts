import {
  AppUserCommandAliases,
  AppUserCommandAliasesKey,
} from '../models/AppUserCommandAliases';
import {Repository} from '../../../data/repository/Repository';
import {SqlDbTable} from '../../../data/persistence/db/SqlDbTable';

export interface AppUserCommandAliasesRepository
  extends Repository<AppUserCommandAliasesKey, AppUserCommandAliases> {
  save(aliases: AppUserCommandAliases): Promise<void>;
}

export class AppUserCommandAliasesTable
  extends SqlDbTable
  implements AppUserCommandAliasesRepository
{
  tableName = 'app_user_command_aliases';

  private selectModelFields = `

SELECT
  app_user_id as appUserId,
  aliases_json as aliasesJson
    
  `.trim();

  async createTable(): Promise<void> {
    const query = `

CREATE TABLE IF NOT EXISTS ${this.tableName} (
  app_user_id INTEGER,
  aliases_json TEXT
)

    `.trim();
    await this.db.run(query, []);
  }

  async get(
    key: AppUserCommandAliasesKey
  ): Promise<AppUserCommandAliases | undefined> {
    const query = `

${this.selectModelFields}
FROM ${this.tableName}
WHERE
  app_user_id = ?
LIMIT 1

    `.trim();
    const data = await this.db.get<IntermediateRepresentation>(query, [
      key.appUserId,
    ]);
    if (data === undefined) {
      return undefined;
    }
    return {
      appUserId: data.appUserId,
      aliases: JSON.parse(data.aliasesJson),
    };
  }

  async add(value: AppUserCommandAliases): Promise<void> {
    const query = `

INSERT INTO ${this.tableName} (
  app_user_id,
  aliases_json
) VALUES (?, ?)

    `.trim();
    await this.db.run(query, [value.appUserId, JSON.stringify(value.aliases)]);
  }

  async update(value: AppUserCommandAliases): Promise<void> {
    const query = `

UPDATE ${this.tableName}
SET
  aliases_json = ?
WHERE 
  app_user_id = ?

    `.trim();
    await this.db.run(query, [JSON.stringify(value.aliases), value.appUserId]);
  }

  async delete(key: AppUserCommandAliasesKey): Promise<void> {
    const query = `

DELETE FROM ${this.tableName}
WHERE
  app_user_id = ?

    `.trim();
    await this.db.run(query, [key.appUserId]);
  }

  async save(aliases: AppUserCommandAliases): Promise<void> {
    if ((await this.get(aliases as AppUserCommandAliasesKey)) !== undefined) {
      await this.update(aliases);
      return;
    }
    await this.add(aliases);
  }
}

type IntermediateRepresentation = {
  appUserId: string;
  aliasesJson: string;
};
