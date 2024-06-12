import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export type SetUsernameResponse = {
  isFailure: boolean;
  failureReason?: 'user not found';
  username?: string;
  mode?: OsuRuleset;
};
