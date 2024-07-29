import {ModCombinationPattern} from '../../../primitives/ModCombinationPattern';
import {OsuServer} from '../../../primitives/OsuServer';

export type GetBeatmapUsersBestScoresRequest = {
  initiatorAppUserId: string;
  server: OsuServer;
  beatmapId: number;
  usernames: string[];
  startPosition: number;
  quantityPerUser: number;
  modPatterns: ModCombinationPattern[];
};
