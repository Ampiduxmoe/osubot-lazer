import {AxiosInstance} from 'axios';
import {OsuRuleset} from '../../../../../../../primitives/OsuRuleset';
import {UserExtended} from './UserExtended';
import {Playmode} from '../common_types/Playmode';

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
    let playmode: Playmode;
    switch (ruleset) {
      case OsuRuleset.osu:
        playmode = 'osu';
        break;
      case OsuRuleset.taiko:
        playmode = 'taiko';
        break;
      case OsuRuleset.ctb:
        playmode = 'fruits';
        break;
      case OsuRuleset.mania:
        playmode = 'mania';
        break;
      default:
        throw Error('Unknown ruleset');
    }
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
}
