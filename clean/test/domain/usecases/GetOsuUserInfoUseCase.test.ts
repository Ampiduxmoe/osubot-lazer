/* eslint-disable prefer-arrow-callback */
import {FakeOsuUsersDao} from '../../mocks/OsuUsersDao';
import {GetOsuUserInfoUseCase} from '../../../src/main/domain/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {GetOsuUserInfoRequest} from '../../../src/main/domain/usecases/get_osu_user_info/GetOsuUserInfoRequest';
import {OsuServer} from '../../../src/primitives/OsuServer';
import {getFakeOsuUserUsername} from '../../mocks/OsuUsers';
import {OsuRuleset} from '../../../src/primitives/OsuRuleset';
import assert = require('assert');

describe('GetOsuUserInfoUseCase', function () {
  const osuUsers = new FakeOsuUsersDao();
  const usecase = new GetOsuUserInfoUseCase(osuUsers);
  describe('#execute()', function () {
    it('should return OsuUserInfo as undefined when user does not exist', async function () {
      const username = 'this username does should not exist';
      // https://stackoverflow.com/a/48768775
      const enumKeys: (e: object) => string[] = e =>
        Object.keys(e).filter(x => {
          return isNaN(Number(x));
        });
      const allServers = enumKeys(OsuServer) as (keyof typeof OsuServer)[];
      const allRulesets = enumKeys(OsuRuleset) as (keyof typeof OsuRuleset)[];
      for (const server of allServers) {
        for (const ruleset of allRulesets) {
          const request: GetOsuUserInfoRequest = {
            appUserId: 'should be irrelevant',
            server: OsuServer[server],
            username: username,
            ruleset: OsuRuleset[ruleset],
          };
          const result = await usecase.execute(request);
          assert.equal(result.userInfo, undefined);
        }
      }
    });
    it('should return correct OsuUserInfo when user exists', async function () {
      const usersThatShouldExist: {
        username: string;
        server: OsuServer;
        ruleset: OsuRuleset;
      }[] = [
        {
          username: getFakeOsuUserUsername(1),
          server: OsuServer.Bancho,
          ruleset: OsuRuleset.osu,
        },
        {
          username: getFakeOsuUserUsername(4),
          server: OsuServer.Bancho,
          ruleset: OsuRuleset.ctb,
        },
        {
          username: getFakeOsuUserUsername(7),
          server: OsuServer.Bancho,
          ruleset: OsuRuleset.taiko,
        },
        {
          username: getFakeOsuUserUsername(10),
          server: OsuServer.Bancho,
          ruleset: OsuRuleset.mania,
        },
      ];
      for (const user of usersThatShouldExist) {
        const request: GetOsuUserInfoRequest = {
          appUserId: 'should be irrelevant',
          server: OsuServer.Bancho,
          username: user.username,
          ruleset: user.ruleset,
        };
        const result = await usecase.execute(request);
        assert.equal(result.userInfo?.username, user.username);
      }
    });
    it('should ignore username string case', async function () {
      const originalUsername = getFakeOsuUserUsername(1);
      const usernameVariants = [
        originalUsername,
        originalUsername.toLowerCase(),
        originalUsername.toUpperCase(),
      ];
      for (const usernameVariant of usernameVariants) {
        const request: GetOsuUserInfoRequest = {
          appUserId: 'should be irrelevant',
          server: OsuServer.Bancho,
          username: usernameVariant,
          ruleset: OsuRuleset.osu,
        };
        const result = await usecase.execute(request);
        assert.equal(result.userInfo?.username, originalUsername);
      }
    });
  });
});
