export interface IUserAccountHistory {
  description: string | null;
  id: number;
  length: number; // in seconds
  permanent: boolean;
  timestamp: string;
  type: string; // "note", "restriction", or "silence"
}
