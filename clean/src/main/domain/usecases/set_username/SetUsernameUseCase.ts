import {AppUsers} from '../../../data/raw/db/tables/AppUsers';
import {UseCase} from '../UseCase';
import {SetUsernameRequest} from './SetUsernameRequest';
import {SetUsernameResponse} from './SetUsernameResponse';
import {OsuUsersDao} from '../../../data/dao/OsuUsersDao';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export class SetUsernameUseCase
  implements UseCase<SetUsernameRequest, SetUsernameResponse>
{
  appUsers: AppUsers;
  osuUsers: OsuUsersDao;
  constructor(appUsers: AppUsers, osuUsers: OsuUsersDao) {
    this.appUsers = appUsers;
    this.osuUsers = osuUsers;
  }

  async execute(params: SetUsernameRequest): Promise<SetUsernameResponse> {
    const osuUser = await this.osuUsers.getByUsername(
      params.username,
      params.server
    );
    if (osuUser === undefined) {
      return {
        isFailure: true,
        failureReason: 'user not found',
      };
    }
    const oldAppUser = await this.appUsers.get({
      id: params.id,
      server: params.server,
    });
    let addOrUpdate = this.appUsers.add;
    if (oldAppUser !== undefined) {
      addOrUpdate = this.appUsers.update;
    }
    await addOrUpdate.call(this.appUsers, {
      id: params.id,
      server: params.server,
      osu_id: osuUser.id,
      username: osuUser.username,
      ruleset: OsuRuleset.osu,
    });
    return {
      isFailure: false,
      username: osuUser.username,
    };
  }
}
