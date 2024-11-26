import {AxiosInstance} from 'axios';
import {withTimingLogs} from '../../../../../primitives/LoggingFunctions';
import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {Playmode} from '../common_types/Playmode';
import {RawBanchoBeatmapExtended} from './RawBanchoBeatmapExtended';
import {RawBanchoBeatmapUserScore} from './RawBanchoBeatmapUserScore';

export class BanchoBeatmaps {
  private url = '/beatmaps';
  private getHttpClient: () => Promise<AxiosInstance>;
  constructor(getHttpClient: () => Promise<AxiosInstance>) {
    this.getHttpClient = getHttpClient;
  }

  async getById(id: number): Promise<RawBanchoBeatmapExtended | undefined> {
    const url = `${this.url}/${id}`;
    const response = await withTimingLogs(
      () => this.getHttpClient().then(client => client.get(url)),
      () => `Trying to get Bancho beatmap ${id}`,
      (_, delta) => `Got response for Bancho beatmap ${id} in ${delta}ms`
    );
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
    const url = `${this.url}/${beatmapId}/scores/users/${userId}/all`;
    const params: {
      ruleset?: Playmode;
    } = {};
    if (ruleset !== undefined) {
      params.ruleset = rulesetToPlaymode(ruleset);
    }
    const response = await withTimingLogs(
      () =>
        this.getHttpClient().then(client =>
          client.get(url, {
            headers: {
              'x-api-version': 20220705,
            },
            params: params,
          })
        ),
      () =>
        `Trying to get Bancho beatmap ${beatmapId} scores for user ${userId} (${rulesetName})`,
      (_, delta) =>
        `Got response for Bancho beatmap ${beatmapId} scores for user ${userId} (${rulesetName}) in ${delta}ms`
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
