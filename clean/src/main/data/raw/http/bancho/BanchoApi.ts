import {OsuApi} from '../OsuAPI';
import {OsuServer} from '../../../../../primitives/OsuServer';
import {BanchoClient} from './client/BanchoClient';
import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {OsuUserInfo} from '../boundary/OsuUserInfo';

export class BanchoApi implements OsuApi {
  private client: BanchoClient;
  constructor(ouathClientId: number, oauthClientSecret: string) {
    this.client = new BanchoClient(ouathClientId, oauthClientSecret);
  }

  server: OsuServer = OsuServer.Bancho;

  async getUser(
    username: string,
    ruleset: OsuRuleset
  ): Promise<OsuUserInfo | undefined> {
    const user = await this.client.users.getByUsername(username, ruleset);
    if (user === undefined) {
      return undefined;
    }
    return {
      id: user.id,
      username: user.username,
      countryCode: user.country_code,
      rankGlobal: user.statistics.global_rank || NaN,
      rankGlobalHighest:
        user.rank_highest === null
          ? undefined
          : {
              value: user.rank_highest!.rank,
              date: String(user.rank_highest!.updated_at),
            },
      rankCountry: user.statistics.country_rank || NaN,
      playcount: user.statistics.play_count,
      level: user.statistics.level.current,
      playtime: user.statistics.play_time,
      pp: user.statistics.pp,
      accuracy: user.statistics.hit_accuracy,
    };
  }

  async getRecentPlays(
    osuId: number,
    includeFails: boolean,
    offset: number,
    quantity: number
  ): Promise<unknown[]> {
    console.log(`Trying to get recent plays on Bancho for ${osuId}...`);
    return [];
  }
}
