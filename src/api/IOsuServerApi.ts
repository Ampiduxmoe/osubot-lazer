import {IUserExtended} from '../../src/dtos/osu/users/IUserExtended';
import {Result} from '../primitives/Result';
import {IScore} from '../../src/dtos/osu/scores/IScore';
import {IBeatmapUserScore} from '../dtos/osu/beatmaps/IBeatmapUserScore';
import {IBeatmapExtended} from '../dtos/osu/beatmaps/IBeatmapExtended';

export interface IOsuServerApi {
  getUser(username: string): Promise<Result<IUserExtended | undefined>>;

  getRecentPlays(
    osu_id: number,
    include_fails: number,
    offset: number,
    limit: number
  ): Promise<Result<IScore[]>>;

  getBestPlays(
    osu_id: number,
    offset: number,
    limit: number
  ): Promise<Result<IScore[]>>;

  getMapUserScore(
    osu_id: number,
    beatmap_id: number,
    mods: string[]
  ): Promise<Result<IBeatmapUserScore | undefined>>;

  getBeatmap(beatmap_id: number): Promise<Result<IBeatmapExtended | undefined>>;
}
