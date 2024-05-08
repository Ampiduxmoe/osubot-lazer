export type AppUserApiRequestsTimeWindowsKey = {time_window_ids: number[]};
export type AppUserApiRequestsUserKey = {app_user_id: string};
export type AppUserApiRequestsTimeUserWithTimeWindowsKey =
  AppUserApiRequestsTimeWindowsKey & AppUserApiRequestsUserKey;

export type AppUserApiRequestsCountKey =
  | AppUserApiRequestsTimeWindowsKey
  | AppUserApiRequestsUserKey
  | AppUserApiRequestsTimeUserWithTimeWindowsKey;

export type AppUserApiRequestsCount = {
  time_window_id: number;
  app_user_id: string;
  target: string;
  subtarget: string | null;
  count: number;
};
