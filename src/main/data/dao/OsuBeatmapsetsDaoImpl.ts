import {AppUserRecentApiRequestsDao} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';
import {
  OsuBeatmapset,
  OsuBeatmapsetsDao,
} from '../../application/requirements/dao/OsuBeatmapsetsDao';
import {OsuServer} from '../../primitives/OsuServer';
import {OsuBeatmapsetInfo} from '../http/boundary/OsuBeatmapsetInfo';
import {OsuApi} from '../http/OsuApi';
import {COMMON_REQUEST_SUBTARGETS} from './AppUserApiRequestsSummariesDaoImpl';

export class OsuBeatmapsetsDaoImpl implements OsuBeatmapsetsDao {
  constructor(
    protected apis: OsuApi[],
    protected recentApiRequests: AppUserRecentApiRequestsDao
  ) {}
  async get(
    appUserId: string,
    id: number,
    server: OsuServer
  ): Promise<OsuBeatmapset | undefined> {
    const api = this.apis.find(api => api.server === server);
    if (api === undefined) {
      throw Error(`Could not find API for server ${OsuServer[server]}`);
    }
    this.recentApiRequests.add({
      time: Date.now(),
      appUserId: appUserId,
      target: OsuServer[api.server],
      subtarget: COMMON_REQUEST_SUBTARGETS.beatmapsetInfo,
      count: 1,
    });
    const beatmapset = await api.getBeatmapset(id);
    if (beatmapset === undefined) {
      return undefined;
    }
    return {
      artist: beatmapset.artist,
      coverUrl: beatmapset.coverUrl,
      creator: beatmapset.creator,
      favouriteCount: beatmapset.favouriteCount,
      id: beatmapset.id,
      playcount: beatmapset.playcount,
      previewUrl: beatmapset.previewUrl,
      status: capitalizeBeatmapsetStatus(beatmapset),
      title: beatmapset.title,
      userId: beatmapset.userId,
      bpm: beatmapset.bpm,
      beatmaps: beatmapset.beatmaps.map(map => ({
        beatmapsetId: map.beatmapsetId,
        difficultyRating: map.difficultyRating,
        id: map.id,
        mode: map.mode,
        totalLength: map.totalLength,
        userId: map.userId,
        version: map.version,
        ar: map.ar,
        cs: map.cs,
        od: map.od,
        hp: map.hp,
        bpm: map.bpm,
        countCircles: map.countCircles,
        countSliders: map.countSliders,
        countSpinners: map.countSpinners,
        hitLength: map.hitLength,
        playcount: map.playcount,
        url: map.url,
        maxCombo: map.maxCombo,
      })),
    };
  }
}

function capitalizeBeatmapsetStatus(
  mapset: OsuBeatmapsetInfo
): CapitalizedBeatmapsetStatus {
  switch (mapset.status) {
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
