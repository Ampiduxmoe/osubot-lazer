import {RecentScoreInfo} from './RecentScoreInfo';
export type UserBestScoreInfo = Pick<RecentScoreInfo, keyof RecentScoreInfo> & {
  pp: number;
};
