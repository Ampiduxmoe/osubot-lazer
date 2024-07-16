export type GetApiUsageSummaryResponse = {
  usageSummary: TimeIntervalUsageSummary[];
};

export type TimeIntervalUsageSummary = {
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
