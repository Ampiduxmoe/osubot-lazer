export type AppUserApiRequestsCountKey = {
  time_window_id: number;
  app_user_id: string;
  target: string;
  subtarget: string | null;
};

export type AppUserApiRequestsCount = AppUserApiRequestsCountKey & {
  count: number;
};
