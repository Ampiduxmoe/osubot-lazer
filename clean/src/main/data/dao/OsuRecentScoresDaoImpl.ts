import {RecentScoreInfo} from '../raw/http/boundary/RecentScoreInfo';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {
  OsuIdAndUsername,
  OsuIdAndUsernameKey,
} from '../raw/db/entities/OsuIdAndUsername';
import {OsuRecentScoresDao, RecentScore} from './OsuRecentScoresDao';
import {OsuApi} from '../raw/http/OsuAPI';
import {SqlDbTable} from '../raw/db/SqlDbTable';

export class OsuRecentScoresDaoImpl implements OsuRecentScoresDao {
  private apis: OsuApi[];
  private osuIdsAndUsernamesTable: SqlDbTable<
    OsuIdAndUsername,
    OsuIdAndUsernameKey
  >;
  constructor(
    apis: OsuApi[],
    osuIdsAndUsernamesTable: SqlDbTable<OsuIdAndUsername, OsuIdAndUsernameKey>
  ) {
    this.apis = apis;
    this.osuIdsAndUsernamesTable = osuIdsAndUsernamesTable;
  }
  async get(
    osuUserId: number,
    server: OsuServer,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset
  ): Promise<RecentScoreInfo[]> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    const scoreInfos = await api.getRecentPlays(
      osuUserId,
      includeFails,
      quantity,
      startPosition,
      ruleset
    );
    if (scoreInfos.length > 0) {
      const scoreInfo = scoreInfos[0];
      const userIdAndUsername = {
        id: scoreInfo.user.id,
        username: scoreInfo.user.username,
      };
      await this.cacheUserId(userIdAndUsername, server);
    }
    return scoreInfos as RecentScore[];
  }

  private async cacheUserId(
    osuUserInfo: OsuUserIdAndUsername,
    server: OsuServer
  ): Promise<void> {
    const newOsuIdAndUsername: OsuIdAndUsername = {
      username: osuUserInfo.username,
      server: server,
      id: osuUserInfo.id,
    };
    const existingIdAndUsername = await this.osuIdsAndUsernamesTable.get(
      newOsuIdAndUsername as OsuIdAndUsernameKey
    );
    if (existingIdAndUsername === undefined) {
      await this.osuIdsAndUsernamesTable.add(newOsuIdAndUsername);
    } else {
      await this.osuIdsAndUsernamesTable.update(newOsuIdAndUsername);
    }
  }
}

interface OsuUserIdAndUsername {
  id: number;
  username: string;
}
