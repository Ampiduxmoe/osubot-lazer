import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../primitives/OsuServer';
import {OsuUserInfo} from '../../../data/http/boundary/OsuUserInfo';

export interface OsuUsersDao {
  getByUsername(
    appUserId: string,
    username: string,
    server: OsuServer,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUser | undefined>;
}

export type OsuUser = Pick<OsuUserInfo, keyof OsuUserInfo>;
