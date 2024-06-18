export type TimeWindowKey = {
  id: number;
};

export type TimeWindow = TimeWindowKey & {
  startTime: number;
  endTime: number;
};
