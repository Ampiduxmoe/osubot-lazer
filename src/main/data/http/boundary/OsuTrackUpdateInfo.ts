import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type OsuTrackUpdateInfo = {
  username: string;
  ruleset: OsuRuleset;
  playcountChange: number;
  rankChange: number;
  ppChange: number;
  accuracyChange: number;
  newHighscores: {
    beatmapId: number;
    pp: number;
    position: number;
  }[];
};
