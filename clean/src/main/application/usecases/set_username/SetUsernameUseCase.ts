import {UseCase} from '../UseCase';
import {SetUsernameRequest} from './SetUsernameRequest';
import {SetUsernameResponse} from './SetUsernameResponse';
import {OsuUsersDao} from '../../requirements/dao/OsuUsersDao';
import {AppUsersDao} from '../../requirements/dao/AppUsersDao';

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
      params.mode
    );
    if (osuUser === undefined) {
      return {
        isFailure: true,
        failureReason: 'user not found',
      };
    }
    const mode = params.mode ?? osuUser.preferredMode;
    this.appUsers.addOrUpdate({
      id: params.appUserId,
      server: params.server,
      osuId: osuUser.id,
      username: osuUser.username,
      ruleset: mode,
    });
    return {
      isFailure: false,
      username: osuUser.username,
      mode: mode,
    };
  }
}
