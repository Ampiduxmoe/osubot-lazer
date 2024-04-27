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
  beatmapset: {
    status: BeatmapsetRankStatus;
    artist: string;
    title: string;
    creator: string;
  };
  beatmap: {
    difficultyName: string;
    length: number;
    bpm: number;
    stars: number;
    ar: number;
    cs: number;
    od: number;
    hp: number;
    maxCombo: number;
    url: string;
  };
  mods: string[];
  totalScore: number;
  combo: number;
  accuracy: number;
  pp: {
    value: number;
    ifFc: number;
    ifSs: number;
  };
  grade: ScoreGrade;
}

export type BeatmapsetRankStatus =
  | 'Graveyard'
  | 'Wip'
  | 'Pending'
  | 'Ranked'
  | 'Approved'
  | 'Qualified'
  | 'Loved';

export type ScoreGrade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
