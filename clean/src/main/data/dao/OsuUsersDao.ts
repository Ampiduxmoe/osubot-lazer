import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuUserInfo} from '../raw/http/boundary/OsuUserInfo';

export type OsuUser = OsuUserInfo;

export interface OsuUsersDao {
  getByUsername(
    username: string,
    server: OsuServer,
    ruleset: OsuRuleset
  ): Promise<OsuUser | undefined>;
}
