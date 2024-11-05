import {UseCase} from '../UseCase';
import {UnlinkUsernameRequest} from './UnlinkUsernameRequest';
import {UnlinkUsernameResponse} from './UnlinkUsernameResponse';
import {AppUsersDao} from '../../requirements/dao/AppUsersDao';

export class UnlinkUsernameUseCase
  implements UseCase<UnlinkUsernameRequest, UnlinkUsernameResponse>
{
  appUsers: AppUsersDao;
  constructor(appUsers: AppUsersDao) {
    this.appUsers = appUsers;
  }

  async execute(
    params: UnlinkUsernameRequest
  ): Promise<UnlinkUsernameResponse> {
    const appUser = await this.appUsers.get(params.appUserId, params.server);
    if (appUser === undefined) {
      return {
        foundAndDeleted: false,
      };
    }
    await this.appUsers.delete(params.appUserId, params.server);
    return {
      foundAndDeleted: true,
    };
  }
}
