import {Timespan} from '../../../primitives/Timespan';

export interface AppUserRecentApiRequestsDao {
  readonly minStoreTime: Timespan;
  cleanUp(): Promise<void>;
  get(appUserId: string, target: string): Promise<AppUserApiRequests[]>;
  add(requests: AppUserApiRequests): Promise<void>;
  readonly events: {
    readonly onNewRequests: {
      subscribe(listener: (requests: AppUserApiRequests) => void): void;
      unsubscribe(listener: (requests: AppUserApiRequests) => void): void;
    };
  };
}

export type AppUserApiRequests = {
  time: number;
  appUserId: string;
  target: string;
  subtarget?: string;
  count: number;
};
