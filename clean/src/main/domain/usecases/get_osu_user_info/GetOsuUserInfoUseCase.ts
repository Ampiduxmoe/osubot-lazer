import {UseCase} from '../UseCase';
import {GetOsuUserInfoRequest} from './GetOsuUserInfoRequest';
import {GetOsuUserInfoResponse} from './GetOsuUserInfoResponse';
import {OsuUsersDao} from '../../../data/dao/OsuUsersDao';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';

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
      params.server,
      OsuRuleset.osu
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
        accuracy: user.accuracy,
        pp: user.pp,
        rankGlobal: user.rankGlobal,
        rankGlobalHighest: user.rankGlobalHighest?.value,
        rankGlobalHighestDate: user.rankGlobalHighest?.date,
        countryCode: user.countryCode,
        rankCountry: user.rankCountry,
        playcount: user.playcount,
        playtimeSeconds: user.playtime,
        level: user.level,
      },
    };
  }
}
