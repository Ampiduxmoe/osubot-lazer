import {OsuRuleset} from '../../../primitives/OsuRuleset';

export interface OsuUserStatsUpdatesDao {
  get(
    appUserId: string,
    username: string,
    ruleset: OsuRuleset
  ): Promise<OsuUserStatsUpdateInfo | undefined>;
}

export type OsuUserStatsUpdateInfo = {
  username: string;
  rankChange: number;
  ppChange: number;
  accuracyChange: number;
  playcountChange: number;
  newHighscores: HighscoreInfo[];
};

type HighscoreInfo = {
  absolutePosition: number;
  pp: number;
  beatmapId: number;
};
