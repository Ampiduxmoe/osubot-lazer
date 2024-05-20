import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUserInfo} from '../raw/http/boundary/OsuUserInfo';

export interface OsuUsersDao {
  getByUsername(
    appUserId: string,
    username: string,
    server: OsuServer,
    ruleset: OsuRuleset
  ): Promise<OsuUser | undefined>;
}

export type OsuUser = Pick<OsuUserInfo, keyof OsuUserInfo>;
