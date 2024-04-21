export interface GetRecentPlaysResponse {
  isFailure: boolean;
  recentPlays?: OsuUserRecentPlays;
  failureReason?: 'user not found';
}

export interface OsuUserRecentPlays {
  username: string;
  plays: RecentPlay[];
}

export interface RecentPlay {
  score: number;
  pp: number;
  accuracy: number;
}
