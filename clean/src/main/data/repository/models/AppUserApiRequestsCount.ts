export type AppUserApiRequestsCountKey = {
  timeWindowId: number;
  appUserId: string;
  target: string;
  subtarget: string | null;
};

export type AppUserApiRequestsCount = AppUserApiRequestsCountKey & {
  count: number;
};
