export interface IBeatmap {
  beatmapset_id: number;
  difficulty_rating: number;
  id: number;
  mode: string;
  status: string;
  total_length: number;
  user_id: number;
  version: string;
  // fields marked as optional in docs:
  max_combo?: number;
  checksum?: string;
  // beatmapset?: ...
  // failtimes?: ...
}
