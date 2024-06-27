import {UseCase} from '../UseCase';
import {GetBeatmapInfoRequest} from './GetBeatmapInfoRequest';
import {GetBeatmapInfoResponse} from './GetBeatmapInfoResponse';
import {OsuBeatmapsDao} from '../../requirements/dao/OsuBeatmapsDao';
import {BeatmapInfoAdapter} from '../../adapters/beatmap_info/BeatmapInfoAdapter';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';

export class GetBeatmapInfoUseCase
  implements UseCase<GetBeatmapInfoRequest, GetBeatmapInfoResponse>
{
  beatmaps: OsuBeatmapsDao;
  beatmapInfoAdapter: BeatmapInfoAdapter;
  constructor(osuUsers: OsuBeatmapsDao, scoreSimulations: ScoreSimulationsDao) {
    this.beatmaps = osuUsers;
    this.beatmapInfoAdapter = new BeatmapInfoAdapter(scoreSimulations);
  }

  async execute(
    params: GetBeatmapInfoRequest
  ): Promise<GetBeatmapInfoResponse> {
    const rawMap = await this.beatmaps.get(
      params.appUserId,
      params.beatmapId,
      params.server
    );
    if (rawMap === undefined) {
      return {
        beatmapInfo: undefined,
      };
    }
    const beatmapScore = this.beatmapInfoAdapter.createBeatmapScore({
      map: rawMap,
      ruleset: rawMap.mode,
      useAccuracyForPp: true,
    });
    return {
      beatmapInfo: {
        id: rawMap.id,
        beatmapsetId: rawMap.beatmapsetId,
        mode: rawMap.mode,
        starRating: rawMap.difficultyRating,
        totalLength: rawMap.totalLength,
        hitLength: rawMap.hitLength,
        maxCombo: rawMap.maxCombo,
        version: rawMap.version,
        ar: rawMap.ar,
        cs: rawMap.cs,
        od: rawMap.od,
        hp: rawMap.hp,
        bpm: rawMap.bpm,
        playcount: rawMap.playcount,
        url: rawMap.url,
        beatmapset: {
          id: rawMap.beatmapset.id,
          artist: rawMap.beatmapset.artist,
          title: rawMap.beatmapset.title,
          bpm: rawMap.beatmapset.bpm,
          creator: rawMap.beatmapset.creator,
          status: rawMap.beatmapset.status,
          playcount: rawMap.beatmapset.playcount,
          favouriteCount: rawMap.beatmapset.favouriteCount,
          coverUrl: rawMap.beatmapset.coverUrl,
          previewUrl: rawMap.beatmapset.previewUrl,
        },
        ppEstimations: [
          {
            accuracy: 100,
            ppValue: await beatmapScore.copy({accuracy: 100}).getEstimatedPp(),
          },
          {
            accuracy: 99,
            ppValue: await beatmapScore.copy({accuracy: 99}).getEstimatedPp(),
          },
          {
            accuracy: 98,
            ppValue: await beatmapScore.copy({accuracy: 98}).getEstimatedPp(),
          },
        ],
      },
    };
  }
}
