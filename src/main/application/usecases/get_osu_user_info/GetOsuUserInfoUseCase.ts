import {UseCase} from '../UseCase';
import {GetOsuUserInfoRequest} from './GetOsuUserInfoRequest';
import {GetOsuUserInfoResponse} from './GetOsuUserInfoResponse';
import {OsuUsersDao} from '../../requirements/dao/OsuUsersDao';

export class GetOsuUserInfoUseCase
  implements UseCase<GetOsuUserInfoRequest, GetOsuUserInfoResponse>
{
  constructor(protected osuUsers: OsuUsersDao) {}

  async execute(
    params: GetOsuUserInfoRequest
  ): Promise<GetOsuUserInfoResponse> {
    const user = await this.osuUsers.getByUsername(
      params.initiatorAppUserId,
      params.username,
      params.server,
      params.ruleset
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
        preferredMode: user.preferredMode,
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
