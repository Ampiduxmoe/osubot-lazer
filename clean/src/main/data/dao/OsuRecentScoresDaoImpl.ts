import {OsuServer} from '../../../primitives/OsuServer';
import {OsuApi} from '../raw/http/OsuAPI';
import {OsuRecentScore, OsuRecentScoresDao} from './OsuRecentScoresDao';

export class OsuRecentScoresDaoImpl implements OsuRecentScoresDao {
  private apis: OsuApi[];
  constructor(apis: OsuApi[]) {
    this.apis = apis;
  }
  async getByUserId(
    osuId: number,
    server: OsuServer,
    includeFails: boolean,
    startPosition: number,
    quantity: number
  ): Promise<OsuRecentScore[]> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    const recentScores = await api.getRecentPlays(
      osuId,
      includeFails,
      startPosition - 1,
      quantity
    );
    return recentScores;
  }
}
