import {AppUserApiRequests} from './AppUserRecentApiRequestsDao';

export interface AppUserApiRequestsSummariesDao {
  add(requests: AppUserApiRequests): Promise<void>;
}

export interface AppUserApiRequestsSummary {
  time_window_start: number;
  time_window_end: number;
  app_users: {
    app_user_id: string;
    counts: {
      target: string;
      subtarget: string | null;
      count: number;
    }[];
  }[];
}
