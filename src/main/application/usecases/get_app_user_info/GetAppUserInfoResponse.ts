import {OsuRuleset} from '../../../primitives/OsuRuleset';

export type GetAppUserInfoResponse = {
  userInfo: AppUserInfo | undefined;
};

type AppUserInfo = {
  osuId: number;
  username: string;
  ruleset: OsuRuleset;
};
