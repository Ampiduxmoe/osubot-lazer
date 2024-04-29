export interface RecentScoreInfo {
  id: number;
  userId: number;
  mods: {
    acronym: string;
    settings?: object;
  }[];
  statistics: {
    great: number;
    ok: number;
    meh: number;
    miss: number;
  };
  rank: 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  accuracy: number;
  startedAt: string | null;
  endedAt: string;
  isPerfectCombo: boolean;
  maxCombo: number;
  passed: boolean;
  pp: number | null;
  totalScore: number;
  beatmap: {
    id: number;
    userId: number;
    version: string;
    totalLength: number;
    hitLength: number;
    difficultyRating: number;
    bpm: number;
    ar: number;
    cs: number;
    od: number;
    hp: number;
    countCircles: number;
    countSliders: number;
    countSpinners: number;
    url: string;
  };
  beatmapset: {
    id: number;
    userId: number;
    creator: string;
    artist: string;
    title: string;
    coverUrl: string;
    status:
      | 'graveyard'
      | 'wip'
      | 'pending'
      | 'ranked'
      | 'approved'
      | 'qualified'
      | 'loved';
  };
  user: {
    id: number;
    username: string;
  };
}
