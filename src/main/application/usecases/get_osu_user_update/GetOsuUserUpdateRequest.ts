import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type GetOsuUserUpdateRequest = {
  initiatorAppUserId: string;
  username: string;
  mode: OsuRuleset | undefined;
};
