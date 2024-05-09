import {OsuUser, OsuUsersDao} from '../../src/main/data/dao/OsuUsersDao';
import {OsuRuleset} from '../../src/primitives/OsuRuleset';
import {OsuServer} from '../../src/primitives/OsuServer';

export class FakeOsuUsersDao implements OsuUsersDao {
  async getByUsername(
    _appUserId: string,
    username: string,
    server: OsuServer,
    ruleset: OsuRuleset
  ): Promise<OsuUser | undefined> {
    return getFakeOsuUsers(server, ruleset).find(
      u => u.username.toLowerCase() === username.toLowerCase()
    );
  }
}

const getFakeOsuUsers: (server: OsuServer, ruleset: OsuRuleset) => OsuUser[] = (
  server,
  ruleset
) => {
  switch (server) {
    case OsuServer.Bancho:
      return getFakeBanchoUsers(ruleset);
    default:
      throw Error('Switch case is not exhaustive');
  }
};

const getFakeBanchoUsers: (ruleset: OsuRuleset) => OsuUser[] = ruleset => {
  switch (ruleset) {
    case OsuRuleset.osu:
      return getFakeBanchoStdUsers();
    case OsuRuleset.ctb:
      return getFakeBanchoCtbUsers();
    case OsuRuleset.taiko:
      return getFakeBanchoTaikoUsers();
    case OsuRuleset.mania:
      return getFakeBanchoManiaUsers();
    default:
      throw Error('Switch case is not exhaustive');
  }
};

const getFakeBanchoStdUsers: () => OsuUser[] = () => [];
const getFakeBanchoCtbUsers: () => OsuUser[] = () => [];
const getFakeBanchoTaikoUsers: () => OsuUser[] = () => [];
const getFakeBanchoManiaUsers: () => OsuUser[] = () => [];
