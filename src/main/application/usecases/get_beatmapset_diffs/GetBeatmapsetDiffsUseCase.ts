import {OsuBeatmapsetsDao} from '../../requirements/dao/OsuBeatmapsetsDao';
import {UseCase} from '../UseCase';
import {GetBeatmapsetDiffsRequest} from './GetBeatmapsetDiffsRequest';
import {GetBeatmapsetDiffsResponse} from './GetBeatmapsetDiffsResponse';

export class GetBeatmapsetDiffsUseCase
  implements UseCase<GetBeatmapsetDiffsRequest, GetBeatmapsetDiffsResponse>
{
  constructor(protected beatmapsets: OsuBeatmapsetsDao) {}

  async execute(
    params: GetBeatmapsetDiffsRequest
  ): Promise<GetBeatmapsetDiffsResponse> {
    const rawMapset = await this.beatmapsets.get(
      params.initiatorAppUserId,
      params.beatmapsetId,
      params.server
    );
    if (rawMapset === undefined) {
      return {
        diffs: undefined,
      };
    }
    return {
      diffs: rawMapset.beatmaps.map(mapInfo => ({
        id: mapInfo.id,
        mode: mapInfo.mode,
        starRating: mapInfo.difficultyRating,
        totalLength: mapInfo.totalLength,
        hitLength: mapInfo.hitLength,
        maxCombo: mapInfo.maxCombo,
        version: mapInfo.version,
        ar: mapInfo.ar,
        cs: mapInfo.cs,
        od: mapInfo.od,
        hp: mapInfo.hp,
        bpm: mapInfo.bpm,
        playcount: mapInfo.playcount,
        url: mapInfo.url,
      })),
    };
  }
}
