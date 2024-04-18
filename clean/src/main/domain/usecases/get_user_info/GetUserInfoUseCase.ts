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
      userId: user.id,
      username: user.username,
      accuracy: user.statistics.hit_accuracy,
      pp: user.statistics.pp,
      rankGlobal: user.statistics.global_rank || NaN,
      countryCode: user.country_code,
      rankCountry: user.statistics.country_rank || NaN,
      playcount: user.statistics.play_count,
      playtimeSeconds: user.statistics.play_time,
      lvl: user.statistics.level.current,
    };
  }
}
