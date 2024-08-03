import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type GetOsuUserUpdateResponse = {
  userUpdateInfo: OsuUserUpdateInfo | undefined;
};

export type OsuUserUpdateInfo = {
  username: string;
  mode: OsuRuleset;
  rankChange: number;
  ppChange: number;
  accuracyChange: number;
  playcountChange: number;
  newHighscores: NewHighscoreInfo[];
};

export type NewHighscoreInfo = {
  absolutePosition: number;
  pp: number;
  beatmapId: number;
};
