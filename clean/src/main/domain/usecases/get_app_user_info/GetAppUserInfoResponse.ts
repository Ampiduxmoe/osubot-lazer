import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export interface GetAppUserInfoResponse {
  userInfo: AppUserInfo | undefined;
}

interface AppUserInfo {
  osuId: number;
  username: string;
  ruleset: OsuRuleset;
}
