export type AppUserApiRequestsTimeWindowsKey = {time_window_ids: number[]};
export type AppUserApiRequestsUserKey = {app_user_id: string};
export type AppUserApiRequestsUserWithTimeWindowsKey =
  AppUserApiRequestsTimeWindowsKey & AppUserApiRequestsUserKey;

export type AppUserApiRequestsCountKey =
  | AppUserApiRequestsTimeWindowsKey
  | AppUserApiRequestsUserKey
  | AppUserApiRequestsUserWithTimeWindowsKey;

export function isAppUserApiRequestsTimeWindowsKey(
  key: AppUserApiRequestsCountKey
): key is AppUserApiRequestsTimeWindowsKey {
  return 'time_window_ids' in key;
}

export function isAppUserApiRequestsUserKey(
  key: AppUserApiRequestsCountKey
): key is AppUserApiRequestsUserKey {
  return 'app_user_id' in key;
}

export function isAppUserApiRequestsUserWithTimeWindowsKey(
  key: AppUserApiRequestsCountKey
): key is AppUserApiRequestsUserWithTimeWindowsKey {
  return 'app_user_id' in key && 'time_window_ids' in key;
}

export type AppUserApiRequestsCount = {
  time_window_id: number;
  app_user_id: string;
  target: string;
  subtarget: string | null;
  count: number;
};
