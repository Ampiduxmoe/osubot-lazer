import {AxiosInstance} from 'axios';
import {OsuRuleset} from '../../../../../../../primitives/OsuRuleset';
import {UserExtended} from './UserExtended';
import {Playmode} from '../common_types/Playmode';
import {RecentScore} from './RecentScore';

export class BanchoUsers {
  private url = '/users';
  private getHttpClient: () => Promise<AxiosInstance>;
  constructor(getHttpClient: () => Promise<AxiosInstance>) {
    this.getHttpClient = getHttpClient;
  }

  async getByUsername(
    username: string,
    ruleset: OsuRuleset
  ): Promise<UserExtended | undefined> {
    console.log(
      `Trying to fetch Bancho user ${username} (${OsuRuleset[ruleset]})`
    );
    const httpClient = await this.getHttpClient();
    const playmode = rulesetToPlaymode(ruleset);
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
    const rawUser: UserExtended = response.data;
    console.log(
      `Successfully fetched Bancho user ${username} (${OsuRuleset[ruleset]})`
    );
    return rawUser;
  }

  async getRecentScores(
    userId: number,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset
  ): Promise<RecentScore[]> {
    const type: UserScoresType = 'recent';
    console.log(
      `Trying to fetch Bancho '${type}' scores for ${userId} (${OsuRuleset[ruleset]})`
    );
    const httpClient = await this.getHttpClient();
    const playmode = rulesetToPlaymode(ruleset);
    const url = `${this.url}/${userId}/scores/${type}`;
    const response = await httpClient.get(url, {
      headers: {
        'x-api-version': 20220705,
      },
      params: {
        include_fails: includeFails ? 1 : 0,
        mode: playmode,
        limit: quantity,
        offset: startPosition - 1,
      },
    });
    const scores: RecentScore[] = response.data;
    console.log(
      `Successfully fetched Bancho '${type}' scores for ${userId} (${OsuRuleset[ruleset]})`
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
    default:
      throw Error('Unknown ruleset');
  }
}

type UserScoresType = 'best' | 'firsts' | 'recent';
