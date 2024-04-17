import {UseCase} from '../UseCase';
import {GetUserInfoRequest} from './GetUserInfoRequest';
import {GetUserInfoResponse} from './GetUserInfoResponse';
import {OsuUsersDao} from '../../../data/dao/OsuUsersDao';

export class GetUserInfoUseCase
  implements UseCase<GetUserInfoRequest, GetUserInfoResponse>
{
  users: OsuUsersDao;
  constructor(users: OsuUsersDao) {
    this.users = users;
  }

  async execute(params: GetUserInfoRequest): Promise<GetUserInfoResponse> {
    const username = params.username;
    const server = params.server;
    const user = await this.users.getByUsername(username, server);
    return {
      username: user.username,
      pp: user.statistics.pp,
    };
  }
}
