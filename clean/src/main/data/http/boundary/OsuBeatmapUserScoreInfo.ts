import {OsuUserRecentScoreInfo} from './OsuUserRecentScoreInfo';
export type OsuBeatmapUserScoreInfo = Omit<
  OsuUserRecentScoreInfo,
  'beatmapset' | 'beatmap' | 'user'
>;
