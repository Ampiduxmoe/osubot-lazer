import {Repository} from '../Repository';
import {OsuUserSnapshotKey, OsuUserSnapshot} from '../models/OsuUserSnapshot';

export interface OsuUserSnapshotsRepository
  extends Repository<OsuUserSnapshotKey, OsuUserSnapshot> {
  readonly expireTimeHours: number;
}
