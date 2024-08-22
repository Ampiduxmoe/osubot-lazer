import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type GetAppUserInfoResponse = {
  userInfo: AppUserInfo | undefined;
};

export type AppUserInfo = {
  osuId: number;
  username: string;
  ruleset: OsuRuleset;
};
