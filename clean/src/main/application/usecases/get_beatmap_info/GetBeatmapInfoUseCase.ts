import {UseCase} from '../UseCase';
import {GetBeatmapInfoRequest} from './GetBeatmapInfoRequest';
import {GetBeatmapInfoResponse} from './GetBeatmapInfoResponse';
import {OsuBeatmapsDao} from '../../requirements/dao/OsuBeatmapsDao';

export class GetBeatmapInfoUseCase
  implements UseCase<GetBeatmapInfoRequest, GetBeatmapInfoResponse>
{
  beatmaps: OsuBeatmapsDao;
  constructor(osuUsers: OsuBeatmapsDao) {
    this.beatmaps = osuUsers;
  }

  async execute(
    params: GetBeatmapInfoRequest
  ): Promise<GetBeatmapInfoResponse> {
    const map = await this.beatmaps.get(
      params.appUserId,
      params.beatmapId,
      params.server
    );
    if (map === undefined) {
      return {
        beatmapInfo: undefined,
      };
    }
    return {
      beatmapInfo: {
        id: map.id,
        beatmapsetId: map.beatmapsetId,
        mode: map.mode,
        starRating: map.difficultyRating,
        totalLength: map.totalLength,
        hitLength: map.hitLength,
        maxCombo: map.maxCombo,
        version: map.version,
        ar: map.ar,
        cs: map.cs,
        od: map.od,
        hp: map.hp,
        bpm: map.bpm,
        playcount: map.playcount,
        url: map.url,
        beatmapset: {
          id: map.beatmapset.id,
          artist: map.beatmapset.artist,
          title: map.beatmapset.title,
          bpm: map.beatmapset.bpm,
          creator: map.beatmapset.creator,
          status: map.beatmapset.status,
          playcount: map.beatmapset.playcount,
          favouriteCount: map.beatmapset.favouriteCount,
          coverUrl: map.beatmapset.coverUrl,
          previewUrl: map.beatmapset.previewUrl,
        },
      },
    };
  }
}
