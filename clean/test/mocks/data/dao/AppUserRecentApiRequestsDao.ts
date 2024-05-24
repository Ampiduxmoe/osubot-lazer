import {
  AppUserApiRequests,
  AppUserRecentApiRequestsDao,
} from '../../../../src/main/data/dao/AppUserRecentApiRequestsDao';
import {Timespan} from '../../../../src/primitives/Timespan';

export class FakeAppUserRecentApiRequestsDao
  implements AppUserRecentApiRequestsDao
{
  minStoreTime = new Timespan().addDays(999);
  private recentRequests: AppUserApiRequests[] = [];
  async convertToSummaries(): Promise<void> {
    this.recentRequests = [];
  }
  async get(appUserId: string, target: string): Promise<AppUserApiRequests[]> {
    return this.recentRequests.filter(
      x => x.appUserId === appUserId && x.target === target
    );
  }
  async add(requests: AppUserApiRequests): Promise<void> {
    this.recentRequests.push(requests);
  }

  private newRequestsListeners: ((requests: AppUserApiRequests) => void)[] = [];
  events = {
    onNewRequests: {
      subscribe: (listener: (requests: AppUserApiRequests) => void) => {
        this.newRequestsListeners.push(listener);
      },
      unsubscribe: (listener: (requests: AppUserApiRequests) => void) => {
        this.newRequestsListeners = this.newRequestsListeners.filter(
          x => x !== listener
        );
      },
      dispatch: (requests: AppUserApiRequests) => {
        for (const listener of this.newRequestsListeners) {
          listener(requests);
        }
      },
    },
  };
}
