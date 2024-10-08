import {AxiosInstance} from 'axios';
import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {RawBanchoUserExtended} from './RawBanchoUserExtended';
import {Playmode} from '../common_types/Playmode';
import {RawBanchoUserRecentScore} from './RawBanchoUserRecentScore';
import {RawBanchoUserBestScore} from './RawBanchoUserBestScore';

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
    console.log(`Trying to get Bancho user ${username} (${rulesetName})`);
    const httpClient = await this.getHttpClient();
    const playmode = ruleset === undefined ? '' : rulesetToPlaymode(ruleset);
    const url = `${this.url}/${username}/${playmode}`;
    const fetchStart = Date.now();
    const response = await httpClient.get(url, {
      params: {
        key: 'username',
      },
    });
    const fetchTime = Date.now() - fetchStart;
    console.log(
      `Fetched Bancho user ${username} (${rulesetName}) in ${fetchTime}ms`
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
    console.log(
      `Trying to get Bancho '${type}' scores for ${userId} (${rulesetName})`
    );
    const httpClient = await this.getHttpClient();
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
    const fetchStart = Date.now();
    const response = await httpClient.get(url, {
      headers: {
        'x-api-version': 20220705,
      },
      params: params,
    });
    const fetchTime = Date.now() - fetchStart;
    console.log(
      `Fetched Bancho '${type}' scores for ${userId} (${rulesetName}) in ${fetchTime}ms`
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
    console.log(
      `Trying to get Bancho '${type}' scores for ${userId} (${rulesetName})`
    );
    const httpClient = await this.getHttpClient();
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
    const fetchStart = Date.now();
    const response = await httpClient.get(url, {
      headers: {
        'x-api-version': 20220705,
      },
      params: params,
    });
    const fetchTime = Date.now() - fetchStart;
    console.log(
      `Fetched Bancho '${type}' scores for ${userId} (${rulesetName}) in ${fetchTime}ms`
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
