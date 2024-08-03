import axios from 'axios';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {RawUpdateResponse} from './RawUpdateResponse';

export class OsuTrackClient {
  private directHttpClient = axios.create({
    baseURL: 'https://ameobea.me/osutrack/api',
    timeout: 4e3,
    validateStatus: (status: number) => {
      if (status === 200) {
        return true;
      }
      if (status === 400 || status === 404) {
        return true;
      }
      return false;
    },
  });

  async update(
    username: string,
    ruleset: OsuRuleset
  ): Promise<RawUpdateResponse | undefined> {
    const response = await this.directHttpClient.get('/get_changes.php', {
      params: {userMode: 'username', user: username, mode: ruleset},
    });
    if (response.status === 400 || response.status === 404) {
      return undefined;
    }
    const update: RawUpdateResponse = response.data;
    if (!update.exists) {
      return undefined;
    }
    return update;
  }
}
