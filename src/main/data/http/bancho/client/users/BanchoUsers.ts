import {AxiosInstance} from 'axios';
import {withTimingLogs} from '../../../../../primitives/LoggingFunctions';
import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {Playmode} from '../common_types/Playmode';
import {RawBanchoUserBestScore} from './RawBanchoUserBestScore';
import {RawBanchoUserExtended} from './RawBanchoUserExtended';
import {RawBanchoUserRecentScore} from './RawBanchoUserRecentScore';

export class BanchoUsers {
  private url = '/users';
  private getHttpClient: () => Promise<AxiosInstance>;
  constructor(getHttpClient: () => Promise<AxiosInstance>) {
    this.getHttpClient = getHttpClient;
  }

  async getByUsername(
    username: string,
    ruleset: OsuRuleset | undefined
  ): Promise<RawBanchoUserExtended | undefined> {
    const rulesetName = ruleset === undefined ? 'default' : OsuRuleset[ruleset];
    const playmode = ruleset === undefined ? '' : rulesetToPlaymode(ruleset);
    const url = `${this.url}/${username}/${playmode}`;
    const response = await withTimingLogs(
      async () =>
        (await this.getHttpClient()).get(url, {
          params: {
            key: 'username',
          },
        }),
      () => `Trying to get Bancho user ${username} (${rulesetName})`,
      (_, delta) =>
        `Got response for Bancho user ${username} (${rulesetName}) in ${delta}ms`
    );
    if (response.status === 404) {
      console.log(`Bancho user with username ${username} was not found`);
      return undefined;
    }
    const rawUser: RawBanchoUserExtended = response.data;
    return rawUser;
  }

  async getRecentScores(
    userId: number,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<RawBanchoUserRecentScore[]> {
    const type: UserScoresType = 'recent';
    const rulesetName = ruleset === undefined ? 'default' : OsuRuleset[ruleset];
    const url = `${this.url}/${userId}/scores/${type}`;
    const params: {
      legacy_only?: 0 | 1;
      include_fails?: 0 | 1;
      mode?: Playmode;
      limit?: number;
      offset?: number;
    } = {
      legacy_only: 0,
      include_fails: includeFails ? 1 : 0,
      limit: quantity,
      offset: startPosition - 1,
    };
    if (ruleset !== undefined) {
      params.mode = rulesetToPlaymode(ruleset);
    }
    const response = await withTimingLogs(
      async () =>
        (await this.getHttpClient()).get(url, {
          headers: {
            'x-api-version': 20220705,
          },
          params: params,
        }),
      () =>
        `Trying to get Bancho '${type}' scores for ${userId} (${rulesetName})`,
      (_, delta) =>
        `Got response for Bancho '${type}' scores for ${userId} (${rulesetName}) in ${delta}ms`
    );
    const scores: RawBanchoUserRecentScore[] = response.data;
    return scores;
  }

  async getBestScores(
    userId: number,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<RawBanchoUserBestScore[]> {
    const type: UserScoresType = 'best';
    const rulesetName = ruleset === undefined ? 'default' : OsuRuleset[ruleset];
    const url = `${this.url}/${userId}/scores/${type}`;
    const params: {
      legacy_only?: 0 | 1;
      mode?: Playmode;
      limit?: number;
      offset?: number;
    } = {
      legacy_only: 0,
      limit: quantity,
      offset: startPosition - 1,
    };
    if (ruleset !== undefined) {
      params.mode = rulesetToPlaymode(ruleset);
    }
    const response = await withTimingLogs(
      async () =>
        (await this.getHttpClient()).get(url, {
          headers: {
            'x-api-version': 20220705,
          },
          params: params,
        }),
      () =>
        `Trying to get Bancho '${type}' scores for ${userId} (${rulesetName})`,
      (_, delta) =>
        `Got response for Bancho '${type}' scores for ${userId} (${rulesetName}) in ${delta}ms`
    );
    const scores: RawBanchoUserBestScore[] = response.data;
    return scores;
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

type UserScoresType = 'best' | 'firsts' | 'recent';
