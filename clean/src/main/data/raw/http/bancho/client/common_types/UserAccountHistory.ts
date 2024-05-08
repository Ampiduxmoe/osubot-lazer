import {ISO8601Timestamp} from './ISO8601Timestamp';

// references:
// https://osu.ppy.sh/docs/index.html#user-useraccounthistory
export type UserAccountHistory = {
  description: string | null;
  id: number;
  /** Condition duration in seconds */
  length: number;
  permanent: boolean;
  timestamp: ISO8601Timestamp;
  type: 'note' | 'restriction' | 'silence';
};
