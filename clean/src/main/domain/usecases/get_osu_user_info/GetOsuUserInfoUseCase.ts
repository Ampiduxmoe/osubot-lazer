import {UseCase} from '../UseCase';
import {GetOsuUserInfoRequest} from './GetOsuUserInfoRequest';
import {GetOsuUserInfoResponse} from './GetOsuUserInfoResponse';
import {OsuUsersDao} from '../../../data/dao/OsuUsersDao';

export class GetOsuUserInfoUseCase
  implements UseCase<GetOsuUserInfoRequest, GetOsuUserInfoResponse>
{
  osuUsers: OsuUsersDao;
  constructor(osuUsers: OsuUsersDao) {
    this.osuUsers = osuUsers;
  }

  async execute(
    params: GetOsuUserInfoRequest
  ): Promise<GetOsuUserInfoResponse> {
    const user = await this.osuUsers.getByUsername(
      params.username,
      params.server
    );
    if (user === undefined) {
      return {
        userInfo: undefined,
      };
    }
    return {
      userInfo: {
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
      },
    };
  }
}
