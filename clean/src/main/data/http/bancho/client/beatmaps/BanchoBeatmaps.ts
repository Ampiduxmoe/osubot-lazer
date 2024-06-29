import {AxiosInstance} from 'axios';
import {RawBanchoBeatmapExtended} from './RawBanchoBeatmapExtended';

export class BanchoBeatmaps {
  private url = '/beatmaps';
  private getHttpClient: () => Promise<AxiosInstance>;
  constructor(getHttpClient: () => Promise<AxiosInstance>) {
    this.getHttpClient = getHttpClient;
  }

  async getById(id: number): Promise<RawBanchoBeatmapExtended | undefined> {
    console.log(`Trying to fetch Bancho beatmap ${id}`);
    const httpClient = await this.getHttpClient();
    const url = `${this.url}/${id}`;
    const response = await httpClient.get(url);
    if (response.status === 404) {
      console.log(`Bancho beatmap ${id} was not found`);
      return undefined;
    }
    const rawBeatmap: RawBanchoBeatmapExtended = response.data;
    console.log(`Successfully fetched Bancho beatmap ${id}`);
    return rawBeatmap;
  }
}
