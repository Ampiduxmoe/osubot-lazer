import {UseCase} from '../UseCase';
import {GetAppUserInfoRequest} from './GetAppUserInfoRequest';
import {GetAppUserInfoResponse} from './GetAppUserInfoResponse';
import {AppUsers} from '../../../data/raw/db/tables/AppUsers';

export class GetAppUserInfoUseCase
  implements UseCase<GetAppUserInfoRequest, GetAppUserInfoResponse>
{
  appUsers: AppUsers;
  constructor(appUsers: AppUsers) {
    this.appUsers = appUsers;
  }

  async execute(
    params: GetAppUserInfoRequest
  ): Promise<GetAppUserInfoResponse> {
    const user = await this.appUsers.get({
      id: params.id,
      server: params.server,
    });
    if (user === undefined) {
      return {
        userInfo: undefined,
      };
    }
    return {
      userInfo: {
        osuId: user.osu_id,
        username: user.username,
        ruleset: user.ruleset,
      },
    };
  }
}
