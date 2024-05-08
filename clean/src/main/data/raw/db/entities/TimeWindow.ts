export type TimeWindowIdsKey = {ids: number[]};
export type TimeWindowIntervalKey = {start_time: number; end_time: number};

export type TimeWindowKey = TimeWindowIdsKey | TimeWindowIntervalKey;

export function isTimeWindowIdsKey(
  key: TimeWindowKey
): key is TimeWindowIdsKey {
  return 'ids' in key;
}

export function isTimeWindowIntervalKey(
  key: TimeWindowKey
): key is TimeWindowIntervalKey {
  return 'start_time' in key && 'end_time' in key;
}

export type TimeWindow = TimeWindowKey & {
  id: number;
  start_time: number;
  end_time: number;
};
