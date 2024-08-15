import {OsuServer} from '../../../primitives/OsuServer';
import {CachedOsuUsersDao} from '../../requirements/dao/CachedOsuUsersDao';
import {OsuUsersDao} from '../../requirements/dao/OsuUsersDao';
import {OsuUserStatsUpdatesDao} from '../../requirements/dao/OsuUserStatsUpdatesDao';
import {UseCase} from '../UseCase';
import {GetOsuUserUpdateRequest} from './GetOsuUserUpdateRequest';
import {GetOsuUserUpdateResponse} from './GetOsuUserUpdateResponse';

export class GetOsuUserUpdateUseCase
  implements UseCase<GetOsuUserUpdateRequest, GetOsuUserUpdateResponse>
{
  constructor(
    protected userUpdates: OsuUserStatsUpdatesDao,
    protected cachedOsuUsers: CachedOsuUsersDao,
    protected osuUsers: OsuUsersDao
  ) {}

  async execute(
    params: GetOsuUserUpdateRequest
  ): Promise<GetOsuUserUpdateResponse> {
    const userSnapshot = await this.cachedOsuUsers.get(
      params.username,
      OsuServer.Bancho
    );
    let targetRuleset = params.mode ?? userSnapshot?.preferredMode;
    if (targetRuleset === undefined) {
      const osuUser = await this.osuUsers.getByUsername(
        params.initiatorAppUserId,
        params.username,
        OsuServer.Bancho,
        undefined
      );
      if (osuUser === undefined) {
        return {userUpdateInfo: undefined};
      }
      targetRuleset ??= osuUser.preferredMode;
    }
    const updateInfo = await this.userUpdates.get(
      params.initiatorAppUserId,
      params.username,
      targetRuleset
    );
    if (updateInfo === undefined) {
      return {
        userUpdateInfo: undefined,
      };
    }
    return {
      userUpdateInfo: {
        username: updateInfo.username,
        mode: targetRuleset,
        rankChange: updateInfo.rankChange,
        ppChange: updateInfo.ppChange,
        accuracyChange: updateInfo.accuracyChange,
        playcountChange: updateInfo.playcountChange,
        newHighscores: updateInfo.newHighscores,
      },
    };
  }
}
