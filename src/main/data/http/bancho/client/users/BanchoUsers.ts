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
    console.log(`Trying to fetch Bancho user ${username} (${rulesetName})`);
    const httpClient = await this.getHttpClient();
    const playmode = ruleset === undefined ? '' : rulesetToPlaymode(ruleset);
    const url = `${this.url}/${username}/${playmode}`;
    const response = await httpClient.get(url, {
      params: {
        key: 'username',
      },
    });
    if (response.status === 404) {
      console.log(`Bancho user with username ${username} was not found`);
      return undefined;
    }
    const rawUser: RawBanchoUserExtended = response.data;
    console.log(
      `Successfully fetched Bancho user ${username} (${rulesetName})`
    );
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
      `Trying to fetch Bancho '${type}' scores for ${userId} (${rulesetName})`
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
    const response = await httpClient.get(url, {
      headers: {
        'x-api-version': 20220705,
      },
      params: params,
    });
    const scores: RawBanchoUserRecentScore[] = response.data;
    console.log(
      `Successfully fetched Bancho '${type}' scores for ${userId} (${rulesetName})`
    );
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
      `Trying to fetch Bancho '${type}' scores for ${userId} (${rulesetName})`
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
    const response = await httpClient.get(url, {
      headers: {
        'x-api-version': 20220705,
      },
      params: params,
    });
    const scores: RawBanchoUserBestScore[] = response.data;
    console.log(
      `Successfully fetched Bancho '${type}' scores for ${userId} (${rulesetName})`
    );
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
