import {UseCase} from '../UseCase';
import {SetUsernameRequest} from './SetUsernameRequest';
import {SetUsernameResponse} from './SetUsernameResponse';
import {OsuUsersDao} from '../../../data/dao/OsuUsersDao';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {AppUsersDao} from '../../../data/dao/AppUsersDao';

export class SetUsernameUseCase
  implements UseCase<SetUsernameRequest, SetUsernameResponse>
{
  appUsers: AppUsersDao;
  osuUsers: OsuUsersDao;
  constructor(appUsers: AppUsersDao, osuUsers: OsuUsersDao) {
    this.appUsers = appUsers;
    this.osuUsers = osuUsers;
  }

  async execute(params: SetUsernameRequest): Promise<SetUsernameResponse> {
    const osuUser = await this.osuUsers.getByUsername(
      params.appUserId,
      params.username,
      params.server,
      OsuRuleset.osu
    );
    if (osuUser === undefined) {
      return {
        isFailure: true,
        failureReason: 'user not found',
      };
    }
    this.appUsers.addOrUpdate({
      id: params.appUserId,
      server: params.server,
      osu_id: osuUser.id,
      username: osuUser.username,
      ruleset: OsuRuleset.osu,
    });
    return {
      isFailure: false,
      username: osuUser.username,
    };
  }
}
