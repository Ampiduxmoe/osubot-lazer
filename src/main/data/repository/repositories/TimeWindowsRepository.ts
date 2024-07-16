import {Repository} from '../Repository';
import {TimeWindowKey, TimeWindow} from '../models/TimeWindow';

export interface TimeWindowsRepository
  extends Repository<TimeWindowKey, TimeWindow> {
  getAllByIds(ids: number[]): Promise<TimeWindow[]>;
  getAllByTimeInterval(
    start_time: number,
    end_time: number
  ): Promise<TimeWindow[]>;
  addWithoutId(value: TimeWindow): Promise<TimeWindow>;
  addAllWithoutIds(values: TimeWindow[]): Promise<TimeWindow[]>;
  deleteAll(keys: TimeWindowKey[]): Promise<void>;
}
