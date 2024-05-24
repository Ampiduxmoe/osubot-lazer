import {OsuApi} from '../../../../../src/main/data/raw/http/OsuAPI';
import {OsuUserInfo} from '../../../../../src/main/data/raw/http/boundary/OsuUserInfo';
import {RecentScoreInfo} from '../../../../../src/main/data/raw/http/boundary/RecentScoreInfo';
import {OsuRuleset} from '../../../../../src/primitives/OsuRuleset';
import {OsuServer} from '../../../../../src/primitives/OsuServer';
import {
  getFakeOsuUserUsername,
  getFakeRecentScoreInfos,
} from '../../../Generators';

export class FakeBanchoApi implements OsuApi {
  server = OsuServer.Bancho;
  async getUser(
    username: string,
    ruleset: OsuRuleset
  ): Promise<OsuUserInfo | undefined> {
    const users = getFakeBanchoUsers(ruleset);
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }
  async getRecentPlays(
    osuUserId: number,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset
  ): Promise<RecentScoreInfo[]> {
    const users = getFakeBanchoUsers(ruleset);
    const user = users.find(u => u.id === osuUserId);
    if (user === undefined) {
      return [];
    }
    return getFakeRecentScoreInfos(osuUserId)
      .filter(x => {
        if (includeFails) {
          return true;
        }
        return x.passed;
      })
      .slice(startPosition - 1, startPosition - 1 + quantity);
  }
}

const getFakeBanchoUsers: (ruleset: OsuRuleset) => OsuUserInfo[] = ruleset => {
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

const getFakeBanchoStdUsers: () => OsuUserInfo[] = () => [
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
const getFakeBanchoCtbUsers: () => OsuUserInfo[] = () => [
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
const getFakeBanchoTaikoUsers: () => OsuUserInfo[] = () => [
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
const getFakeBanchoManiaUsers: () => OsuUserInfo[] = () => [
  ...[10, 11, 12, 13, 14].map(n => ({
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
