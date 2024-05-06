export interface GetApiUsageSummaryResponse {
  usageSummary: TimeIntervalUsageSummary[];
}

export interface TimeIntervalUsageSummary {
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
}
