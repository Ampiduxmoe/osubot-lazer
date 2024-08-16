import {AxiosInstance} from 'axios';
import {RawBanchoBeatmapExtended} from './RawBanchoBeatmapExtended';
import {RawBanchoBeatmapUserScore} from './RawBanchoBeatmapUserScore';
import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {Playmode} from '../common_types/Playmode';

export class BanchoBeatmaps {
  private url = '/beatmaps';
  private getHttpClient: () => Promise<AxiosInstance>;
  constructor(getHttpClient: () => Promise<AxiosInstance>) {
    this.getHttpClient = getHttpClient;
  }

  async getById(id: number): Promise<RawBanchoBeatmapExtended | undefined> {
    console.log(`Trying to get Bancho beatmap ${id}`);
    const httpClient = await this.getHttpClient();
    const url = `${this.url}/${id}`;
    const fetchStart = Date.now();
    const response = await httpClient.get(url);
    const fetchTime = Date.now() - fetchStart;
    console.log(`Fetched Bancho beatmap ${id} in ${fetchTime}ms`);
    if (response.status === 404) {
      console.log(`Bancho beatmap ${id} was not found`);
      return undefined;
    }
    const rawBeatmap: RawBanchoBeatmapExtended = response.data;
    return rawBeatmap;
  }

  async getUserScores(
    beatmapId: number,
    userId: number,
    ruleset: OsuRuleset | undefined
  ): Promise<RawBanchoBeatmapUserScore[] | undefined> {
    const rulesetName = ruleset === undefined ? 'default' : OsuRuleset[ruleset];
    console.log(
      `Trying to get Bancho beatmap ${beatmapId} scores for user ${userId} (${rulesetName})`
    );
    const httpClient = await this.getHttpClient();
    const url = `${this.url}/${beatmapId}/scores/users/${userId}/all`;
    const params: {
      ruleset?: Playmode;
    } = {};
    if (ruleset !== undefined) {
      params.ruleset = rulesetToPlaymode(ruleset);
    }
    const fetchStart = Date.now();
    const response = await httpClient.get(url, {
      headers: {
        'x-api-version': 20220705,
      },
      params: params,
    });
    const fetchTime = Date.now() - fetchStart;
    console.log(
      `Fetched Bancho beatmap ${beatmapId} scores for user ${userId} (${rulesetName}) in ${fetchTime}ms`
    );
    if (response.status === 404) {
      console.log(`Bancho beatmap ${beatmapId} was not found`);
      return undefined;
    }
    const data: {scores: RawBanchoBeatmapUserScore[]} = response.data;
    const rawScores = data.scores;
    return rawScores;
  }
}

function rulesetToPlaymode(ruleset: OsuRuleset): Playmode {
  switch (ruleset) {
    case OsuRuleset.osu:
      return 'osu';
    case OsuRuleset.taiko:
      return 'taiko';
    case OsuRuleset.ctb:
      return 'fruits';
    case OsuRuleset.mania:
      return 'mania';
  }
}
