import {AxiosInstance} from 'axios';
import {RawBanchoBeatmapsetExtended} from './RawBanchoBeatmapsetExtended';

export class BanchoBeatmapsets {
  private url = '/beatmapsets';
  private getHttpClient: () => Promise<AxiosInstance>;
  constructor(getHttpClient: () => Promise<AxiosInstance>) {
    this.getHttpClient = getHttpClient;
  }

  async getById(id: number): Promise<RawBanchoBeatmapsetExtended | undefined> {
    console.log(`Trying to get Bancho beatmapset ${id}`);
    const httpClient = await this.getHttpClient();
    const url = `${this.url}/${id}`;
    const fetchStart = Date.now();
    const response = await httpClient.get(url);
    const fetchTime = Date.now() - fetchStart;
    console.log(`Fetched Bancho beatmapset ${id} in ${fetchTime}ms`);
    if (response.status === 404) {
      console.log(`Bancho beatmapset ${id} was not found`);
      return undefined;
    }
    const rawBeatmap: RawBanchoBeatmapsetExtended = response.data;
    return rawBeatmap;
  }
}
