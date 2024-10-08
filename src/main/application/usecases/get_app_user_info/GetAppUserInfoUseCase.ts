import {AppUsersDao} from '../../requirements/dao/AppUsersDao';
import {UseCase} from '../UseCase';
import {GetAppUserInfoRequest} from './GetAppUserInfoRequest';
import {GetAppUserInfoResponse} from './GetAppUserInfoResponse';

export class GetAppUserInfoUseCase
  implements UseCase<GetAppUserInfoRequest, GetAppUserInfoResponse>
{
  constructor(protected appUsers: AppUsersDao) {}

  async execute(
    params: GetAppUserInfoRequest
  ): Promise<GetAppUserInfoResponse> {
    const user = await this.appUsers.get(params.id, params.server);
    if (user === undefined) {
      return {
        userInfo: undefined,
      };
    }
    return {
      userInfo: {
        osuId: user.osuId,
        username: user.username,
        ruleset: user.ruleset,
      },
    };
  }
}
