import {OsuUser, OsuUsersDao} from '../../src/main/data/dao/OsuUsersDao';
import {OsuRuleset} from '../../src/primitives/OsuRuleset';
import {OsuServer} from '../../src/primitives/OsuServer';
import {getFakeOsuUserUsername} from './OsuUsers';

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

export const getFakeOsuUsers: (
  server: OsuServer,
  ruleset: OsuRuleset
) => OsuUser[] = (server, ruleset) => {
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

const getFakeBanchoStdUsers: () => OsuUser[] = () => [
  ...[1, 2, 3, 4, 5].map(n => ({
    id: n,
    username: getFakeOsuUserUsername(n),
    countryCode: 'FAKE',
    rankGlobal: n * 100,
    rankGlobalHighest: {
      value: n * 50,
      date: '1970-01-01T00:00:00.000Z',
    },
    rankCountry: n * 10,
    playcount: n * 1000,
    level: 100,
    playtime: n * 100000,
    pp: 25000 - n * 100,
    accuracy: 1 - n / 100,
  })),
];
const getFakeBanchoCtbUsers: () => OsuUser[] = () => [
  ...[4, 5, 6, 7, 8].map(n => ({
    id: n,
    username: getFakeOsuUserUsername(n),
    countryCode: 'FAKE',
    rankGlobal: n * 100,
    rankGlobalHighest: {
      value: n * 50,
      date: '1970-01-01T00:00:00.000Z',
    },
    rankCountry: n * 10,
    playcount: n * 1000,
    level: 100,
    playtime: n * 100000,
    pp: 25000 - n * 100,
    accuracy: 1 - n / 100,
  })),
];
const getFakeBanchoTaikoUsers: () => OsuUser[] = () => [
  ...[7, 8, 9, 10, 11].map(n => ({
    id: n,
    username: getFakeOsuUserUsername(n),
    countryCode: 'FAKE',
    rankGlobal: n * 100,
    rankGlobalHighest: {
      value: n * 50,
      date: '1970-01-01T00:00:00.000Z',
    },
    rankCountry: n * 10,
    playcount: n * 1000,
    level: 100,
    playtime: n * 100000,
    pp: 25000 - n * 100,
    accuracy: 1 - n / 100,
  })),
];
const getFakeBanchoManiaUsers: () => OsuUser[] = () => [
  ...[12, 13, 14, 15, 16].map(n => ({
    id: n,
    username: getFakeOsuUserUsername(n),
    countryCode: 'FAKE',
    rankGlobal: n * 100,
    rankGlobalHighest: {
      value: n * 50,
      date: '1970-01-01T00:00:00.000Z',
    },
    rankCountry: n * 10,
    playcount: n * 1000,
    level: 100,
    playtime: n * 100000,
    pp: 25000 - n * 100,
    accuracy: 1 - n / 100,
  })),
];
