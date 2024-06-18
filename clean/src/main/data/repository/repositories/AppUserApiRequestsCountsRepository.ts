import {Repository} from '../Repository';
import {
  AppUserApiRequestsCount,
  AppUserApiRequestsCountKey,
} from '../models/AppUserApiRequestsCount';

export interface AppUserApiRequestsCountsRepository
  extends Repository<AppUserApiRequestsCountKey, AppUserApiRequestsCount> {
  getAllByTimeWindows(
    time_window_ids: number[]
  ): Promise<AppUserApiRequestsCount[]>;
  getAllByAppUserAndTimeWindows(
    app_user_id: string,
    time_window_ids: number[]
  ): Promise<AppUserApiRequestsCount[]>;
}
