import {Timespan} from '../../../primitives/Timespan';
export interface AppUserRecentApiRequestsDao {
  readonly minStoreTime: Timespan;
  convertToSummaries(): Promise<void>;
  get(appUserId: string, target: string): Promise<AppUserApiRequests[]>;
  add(requests: AppUserApiRequests): Promise<void>;
  readonly events: {
    readonly onNewRequests: {
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
  osuUserInfo: 'user_info',
  userRecentPlays: 'user_recent_plays',
};
