import {ISO8601Timestamp} from './ISO8601Timestamp';

// references:
// https://osu.ppy.sh/docs/index.html#user-userbadge
export type UserBadge = {
  awarded_at: ISO8601Timestamp;
  description: string;
  'image@2x_url': string;
  image_url: string;
  url: string;
};
