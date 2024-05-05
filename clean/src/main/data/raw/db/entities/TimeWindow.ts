export type TimeWindowIdsKey = {ids: number[]};
export type TimeWindowIntervalKey = {start_time: number; end_time: number};

export type TimeWindowKey = TimeWindowIdsKey | TimeWindowIntervalKey;

export type TimeWindow = TimeWindowKey & {
  id: number;
  start_time: number;
  end_time: number;
};
