import {GetBeatmapInfoUseCase} from '../../../application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {GetBeatmapsetDiffsUseCase} from '../../../application/usecases/get_beatmapset_diffs/GetBeatmapsetDiffsUseCase';
import {OsuServer} from '../../../primitives/OsuServer';
import {DiffBrief} from './DiffBrief';

export class BeatmapsetDiffBriefProvider {
  constructor(
    protected getBeatmapsetDiffs: GetBeatmapsetDiffsUseCase,
    protected getBeatmapInfo: GetBeatmapInfoUseCase,
    public cacheCapacity: number
  ) {}

  private cache: {
    server: OsuServer;
    beatmapsetId: number;
    diffs: DiffBrief[];
  }[] = [];

  async get(
    initiatorAppUserId: string,
    server: OsuServer,
    beatmapsetId: number
  ): Promise<DiffBrief[]> {
    const cache = this.cache;
    const cachedValue = cache.find(
      x => x.server === server && x.beatmapsetId === beatmapsetId
    );
    if (cachedValue !== undefined) {
      return cachedValue.diffs;
    }
    const diffsResult = await this.getBeatmapsetDiffs.execute({
      initiatorAppUserId,
      server,
      beatmapsetId,
    });
    if (diffsResult.diffs === undefined) {
      throw Error('Invalid beatmapset ID');
    }
    const briefs: DiffBrief[] = diffsResult.diffs.map(diff => ({
      id: diff.id,
      starRating: diff.starRating,
      diffName: diff.version,
    }));
    briefs.sort((a, b) => a.starRating - b.starRating);
    cache.push({server: server, beatmapsetId: beatmapsetId, diffs: briefs});
    if (cache.length > this.cacheCapacity) {
      cache.splice(0, Math.floor(this.cacheCapacity / 2));
    }
    return briefs;
  }

  async getByBeatmapId(
    initiatorAppUserId: string,
    server: OsuServer,
    beatmapId: number
  ): Promise<DiffBrief[]> {
    const cache = this.cache;
    const cachedValue = cache.find(
      x =>
        x.server === server &&
        x.diffs.find(diff => diff.id === beatmapId) !== undefined
    );
    if (cachedValue !== undefined) {
      return cachedValue.diffs;
    }
    const beatmapInfoResult = await this.getBeatmapInfo.execute({
      initiatorAppUserId: initiatorAppUserId,
      server: server,
      beatmapId: beatmapId,
    });
    if (beatmapInfoResult.beatmapInfo === undefined) {
      throw Error('Invalid beatmap ID');
    }
    return await this.get(
      initiatorAppUserId,
      server,
      beatmapInfoResult.beatmapInfo.beatmapset.id
    );
  }
}
