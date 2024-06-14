export type TimeWindowKey = {
  id: number;
};

export type TimeWindow = TimeWindowKey & {
  start_time: number;
  end_time: number;
};
