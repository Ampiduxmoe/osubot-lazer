import {OsuServer} from '../../primitives/OsuServer';
import {
  OsuBeatmap,
  OsuBeatmapsDao,
} from '../../application/requirements/dao/OsuBeatmapsDao';
import {OsuApi} from '../http/OsuApi';
import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {OsuBeatmapInfo} from '../http/boundary/OsuBeatmapInfo';
import {COMMON_REQUEST_SUBTARGETS} from './AppUserApiRequestsSummariesDaoImpl';

export class OsuBeatmapsDaoImpl implements OsuBeatmapsDao {
  private apis: OsuApi[];
  private recentApiRequests: AppUserRecentApiRequestsDao;
  constructor(apis: OsuApi[], recentApiRequests: AppUserRecentApiRequestsDao) {
    this.apis = apis;
    this.recentApiRequests = recentApiRequests;
  }
  async get(
    appUserId: string,
    id: number,
    server: OsuServer
  ): Promise<OsuBeatmap | undefined> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    this.recentApiRequests.add({
      time: Date.now(),
      appUserId: appUserId,
      target: OsuServer[api.server],
      subtarget: COMMON_REQUEST_SUBTARGETS.beatmapInfo,
      count: 1,
    });
    const beatmap = await api.getBeatmap(id);
    if (beatmap === undefined) {
      return undefined;
    }
    return {
      beatmapsetId: beatmap.beatmapsetId,
      difficultyRating: beatmap.difficultyRating,
      id: beatmap.id,
      mode: beatmap.mode,
      totalLength: beatmap.totalLength,
      userId: beatmap.userId,
      version: beatmap.version,
      ar: beatmap.ar,
      cs: beatmap.cs,
      od: beatmap.od,
      hp: beatmap.hp,
      bpm: beatmap.bpm,
      countCircles: beatmap.countCircles,
      countSliders: beatmap.countSliders,
      countSpinners: beatmap.countSpinners,
      hitLength: beatmap.hitLength,
      playcount: beatmap.playcount,
      url: beatmap.url,
      beatmapset: {
        artist: beatmap.beatmapset.artist,
        coverUrl: beatmap.beatmapset.coverUrl,
        creator: beatmap.beatmapset.creator,
        favouriteCount: beatmap.beatmapset.favouriteCount,
        id: beatmap.beatmapset.id,
        playcount: beatmap.beatmapset.playcount,
        previewUrl: beatmap.beatmapset.previewUrl,
        status: capitalizeBeatmapsetStatus(beatmap),
        title: beatmap.beatmapset.title,
        userId: beatmap.beatmapset.userId,
        bpm: beatmap.beatmapset.bpm,
      },
      maxCombo: beatmap.maxCombo,
    };
  }
}

function capitalizeBeatmapsetStatus(
  map: OsuBeatmapInfo
): CapitalizedBeatmapsetStatus {
  switch (map.beatmapset.status) {
    case 'graveyard':
      return 'Graveyard';
    case 'wip':
      return 'Wip';
    case 'pending':
      return 'Pending';
    case 'ranked':
      return 'Ranked';
    case 'approved':
      return 'Approved';
    case 'qualified':
      return 'Qualified';
    case 'loved':
      return 'Loved';
  }
}

type CapitalizedBeatmapsetStatus =
  | 'Graveyard'
  | 'Wip'
  | 'Pending'
  | 'Ranked'
  | 'Approved'
  | 'Qualified'
  | 'Loved';
