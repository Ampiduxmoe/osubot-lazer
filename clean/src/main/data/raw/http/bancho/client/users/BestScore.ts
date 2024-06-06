import {RecentScore} from './RecentScore';
export type BestScore = Pick<RecentScore, keyof RecentScore> & {
  pp: number;
};
