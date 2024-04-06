import {IUserExtended} from '../../src/dtos/osu/users/IUserExtended';
import {Result} from '../primitives/Result';
import {IScore} from '../../src/dtos/osu/scores/IScore';

export interface IOsuServerApi {
  getUser(username: string): Promise<Result<IUserExtended | undefined>>;

  gerRecentPlays(
    osu_id: number,
    offset: number,
    limit: number
  ): Promise<Result<IScore[]>>;

  getBestPlays(
    osu_id: number,
    offset: number,
    limit: number
  ): Promise<Result<IScore[]>>;
}
