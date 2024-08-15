import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {
  OsuUserStatsUpdatesDao,
  OsuUserStatsUpdateInfo,
} from '../../application/requirements/dao/OsuUserStatsUpdatesDao';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuTrackApi} from '../http/osutrack/OsuTrackApi';

export class OsuUserStatsUpdatesDaoImpl implements OsuUserStatsUpdatesDao {
  private osuTrackApi = new OsuTrackApi();

  constructor(protected recentApiRequests: AppUserRecentApiRequestsDao) {}

  async get(
    appUserId: string,
    username: string,
    ruleset: OsuRuleset
  ): Promise<OsuUserStatsUpdateInfo | undefined> {
    await this.recentApiRequests.add({
      time: Date.now(),
      appUserId: appUserId,
      target: 'osutrack',
      subtarget: 'update',
      count: 1,
    });
    const updateInfo = await this.osuTrackApi.update(username, ruleset);
    if (updateInfo === undefined) {
      return undefined;
    }
    return {
      username: updateInfo.username,
      rankChange: updateInfo.rankChange,
      ppChange: updateInfo.ppChange,
      accuracyChange: updateInfo.accuracyChange,
      playcountChange: updateInfo.playcountChange,
      newHighscores: updateInfo.newHighscores.map(s => ({
        absolutePosition: s.position,
        pp: s.pp,
        beatmapId: s.beatmapId,
      })),
    };
  }
}
