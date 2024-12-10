import {AxiosInstance} from 'axios';
import {withTimingLogs} from '../../../../../primitives/LoggingFunctions';
import {RawBanchoBeatmapsetExtended} from './RawBanchoBeatmapsetExtended';

export class BanchoBeatmapsets {
  private url = '/beatmapsets';
  private getHttpClient: () => Promise<AxiosInstance>;
  constructor(getHttpClient: () => Promise<AxiosInstance>) {
    this.getHttpClient = getHttpClient;
  }

  async getById(id: number): Promise<RawBanchoBeatmapsetExtended | undefined> {
    const url = `${this.url}/${id}`;
    const response = await withTimingLogs(
      async () => (await this.getHttpClient()).get(url),
      () => `Trying to get Bancho beatmapset ${id}`,
      (_, delta) => `Got response for Bancho beatmapset ${id} in ${delta}ms`
    );
    if (response.status === 404) {
      console.log(`Bancho beatmapset ${id} was not found`);
      return undefined;
    }
    const rawBeatmap: RawBanchoBeatmapsetExtended = response.data;
    return rawBeatmap;
  }
}
