import {IUserExtended} from '../../src/dtos/osu/users/IUserExtended';
import {Result} from '../primitives/Result';
import {IScore} from '../../src/dtos/osu/scores/IScore';

export interface IOsuServerApi {
  getUser(username: string): Promise<Result<IUserExtended | undefined>>;
  gerRecentPlay(osu_id: number): Promise<Result<IScore | undefined>>;
}
