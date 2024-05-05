import {Timespan} from '../../../primitives/Timespan';
export interface AppUserRecentApiRequestsDao {
  storedFor: Timespan;
  convertToSummaries(): Promise<void>;
  get(appUserId: string, target: string): Promise<AppUserApiRequests[]>;
  add(requests: AppUserApiRequests): Promise<void>;
  events: {
    onNewRequests: {
      subscribe(listener: (requests: AppUserApiRequests) => void): void;
      unsubscribe(listener: (requests: AppUserApiRequests) => void): void;
    };
  };
}

export interface AppUserApiRequests {
  time: number;
  appUserId: string;
  target: string;
  subtarget?: string;
  count: number;
}

export const COMMON_REQUEST_SUBTARGETS = {
  osuUserInfo: 'osu user info',
  userRecentPlays: 'user recent plays',
};
