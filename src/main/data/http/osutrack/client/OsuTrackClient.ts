import axios from 'axios';
import {withTimingLogs} from '../../../../primitives/LoggingFunctions';
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
    const response = await withTimingLogs(
      () =>
        this.directHttpClient.get('/get_changes.php', {
          params: {userMode: 'username', user: username, mode: ruleset},
        }),
      () =>
        `Trying to get osutrack changes for ${username} (${OsuRuleset[ruleset]})`,
      (_, delta) =>
        `Got response for osutrack changes for ${username} in ${delta}ms`
    );
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
