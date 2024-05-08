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
  const typedKey = key as AppUserApiRequestsTimeWindowsKey;
  return typedKey.time_window_ids !== undefined;
}

export function isAppUserApiRequestsUserKey(
  key: AppUserApiRequestsCountKey
): key is AppUserApiRequestsUserKey {
  const typedKey = key as AppUserApiRequestsUserKey;
  return typedKey.app_user_id !== undefined;
}

export function isAppUserApiRequestsUserWithTimeWindowsKey(
  key: AppUserApiRequestsCountKey
): key is AppUserApiRequestsUserWithTimeWindowsKey {
  const typedKey = key as AppUserApiRequestsUserWithTimeWindowsKey;
  return (
    typedKey.time_window_ids !== undefined && typedKey.app_user_id !== undefined
  );
}

export type AppUserApiRequestsCount = {
  time_window_id: number;
  app_user_id: string;
  target: string;
  subtarget: string | null;
  count: number;
};
