import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuTrackUpdateInfo} from '../boundary/OsuTrackUpdateInfo';
import {OsuTrackClient} from './client/OsuTrackClient';

export class OsuTrackApi {
  private client = new OsuTrackClient();

  async update(
    username: string,
    ruleset: OsuRuleset
  ): Promise<OsuTrackUpdateInfo | undefined> {
    const rawResponse = await this.client.update(username, ruleset);
    if (rawResponse === undefined) {
      return undefined;
    }
    return {
      username: rawResponse.username,
      ruleset: rawResponse.mode,
      playcountChange: rawResponse.playcount,
      rankChange: rawResponse.pp_rank,
      ppChange: rawResponse.pp_raw,
      accuracyChange: rawResponse.accuracy,
      newHighscores: rawResponse.newhs.map(s => ({
        beatmapId: parseInt(s.beatmap_id),
        pp: parseInt(s.pp),
        position: s.ranking + 1,
      })),
    };
  }
}
