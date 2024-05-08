export type TimeWindowIdsKey = {ids: number[]};
export type TimeWindowIntervalKey = {start_time: number; end_time: number};

export type TimeWindowKey = TimeWindowIdsKey | TimeWindowIntervalKey;

export function isTimeWindowIdsKey(
  key: TimeWindowKey
): key is TimeWindowIdsKey {
  const typedKey = key as TimeWindowIdsKey;
  return typedKey.ids !== undefined;
}

export function isTimeWindowIntervalKey(
  key: TimeWindowKey
): key is TimeWindowIntervalKey {
  const typedKey = key as TimeWindowIntervalKey;
  return typedKey.start_time !== undefined && typedKey.end_time !== undefined;
}

export type TimeWindow = TimeWindowKey & {
  id: number;
  start_time: number;
  end_time: number;
};
