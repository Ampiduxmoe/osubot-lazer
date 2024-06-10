import {AppUserApiRequests} from './AppUserRecentApiRequestsDao';

export interface AppUserApiRequestsSummariesDao {
  add(requests: AppUserApiRequests): Promise<void>;
  get(
    timeStart: number,
    timeEnd: number,
    targetAppUserId: string | undefined
  ): Promise<AppUserApiRequestsSummary[]>;
}

export type AppUserApiRequestsSummary = {
  timeWindowStart: number;
  timeWindowEnd: number;
  appUsers: {
    appUserId: string;
    counts: {
      target: string;
      subtarget: string | null;
      count: number;
    }[];
  }[];
};
