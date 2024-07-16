import {Timespan} from '../../primitives/Timespan';
import {AppUserApiRequestsSummariesDao} from '../../application/requirements/dao/AppUserApiRequestsSummariesDao';
import {
  AppUserApiRequests,
  AppUserRecentApiRequestsDao,
} from '../../application/requirements/dao/AppUserRecentApiRequestsDao';

export class AppUserRecentApiRequestsDaoImpl
  implements AppUserRecentApiRequestsDao
{
  private requestsCleanupJob: NodeJS.Timeout | undefined = undefined;
  private requests: AppUserApiRequests[] = [];

  private requestSummaries: AppUserApiRequestsSummariesDao;
  constructor(requestSummaries: AppUserApiRequestsSummariesDao) {
    this.requestSummaries = requestSummaries;
  }

  minStoreTime = new Timespan().addMinutes(5);

  async cleanUp(): Promise<void> {
    const requests = this.requests;
    this.requests = [];
    for (const r of requests) {
      await this.requestSummaries.add(r);
    }
  }

  async get(appUserId: string, target: string): Promise<AppUserApiRequests[]> {
    return this.requests.filter(
      r => r.appUserId === appUserId && r.target === target
    );
  }

  async add(requests: AppUserApiRequests): Promise<void> {
    this.requests.push(requests);
    this.events.onNewRequests.dispatch(requests);
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

  startRequestsCleanups(interval: number) {
    if (this.requestsCleanupJob !== undefined) {
      return;
    }
    this.requestsCleanupJob = setInterval(
      async () => await this.convertOldRequestsToSummaries(),
      interval
    );
    console.log('Recent API requests cleanups started');
  }

  stopRequestsCleanups() {
    if (this.requestsCleanupJob === undefined) {
      return;
    }
    clearInterval(this.requestsCleanupJob);
    console.log('Recent API requests cleanups stopped');
  }

  private async convertOldRequestsToSummaries(): Promise<void> {
    const now = Date.now();
    const timeThreshold = now - this.minStoreTime.totalMiliseconds();
    const oldRequestsFilter = (requests: AppUserApiRequests): boolean => {
      return requests.time < timeThreshold;
    };
    const requests = this.requests;
    const oldRequests = requests.filter(oldRequestsFilter);
    const remainingRequests = requests.filter(r => !oldRequestsFilter(r));
    for (const oldRequest of oldRequests) {
      await this.requestSummaries.add(oldRequest);
    }
    this.requests = remainingRequests;
  }
}
