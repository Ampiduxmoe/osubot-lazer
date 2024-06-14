export type Cacheable<T> = T & {
  creation_time: number;
  expires_at: number;
};
