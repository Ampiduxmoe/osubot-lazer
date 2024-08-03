export type RawUpdateResponse = {
  username: string;
  mode: number;
  playcount: number;
  pp_rank: number;
  pp_raw: number;
  accuracy: number;
  total_score: number;
  ranked_score: number;
  count300: number;
  count50: number;
  count100: number;
  level: number;
  count_rank_a: number;
  count_rank_s: number;
  count_rank_ss: number;
  levelup: boolean;
  first: boolean;
  exists: boolean;
  newhs: {
    beatmap_id: string;
    score_id: string;
    score: string;
    maxcombo: string;
    count50: string;
    count100: string;
    count300: string;
    countmiss: string;
    countkatu: string;
    countgeki: string;
    perfect: string;
    enabled_mods: string;
    user_id: string;
    date: string;
    rank: string;
    pp: string;
    replay_available: string;
    ranking: number;
  }[];
};
