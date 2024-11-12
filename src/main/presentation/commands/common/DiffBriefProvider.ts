import {GetBeatmapsetDiffsUseCase} from '../../../application/usecases/get_beatmapset_diffs/GetBeatmapsetDiffsUseCase';
import {OsuServer} from '../../../primitives/OsuServer';
import {DiffBrief} from './DiffBrief';

export class BeatmapsetDiffBriefProvider {
  constructor(
    protected getBeatmapsetDiffs: GetBeatmapsetDiffsUseCase,
    public cacheCapacity: number
  ) {}

  get: (
    initiatorAppUserId: string,
    server: OsuServer,
    beatmapsetId: number
  ) => Promise<DiffBrief[]> = (() => {
    const cache: {
      server: OsuServer;
      beatmapsetId: number;
      diffs: DiffBrief[];
    }[] = [];
    return async (initiatorAppUserId, server, beatmapsetId) => {
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
    };
  })();
}
