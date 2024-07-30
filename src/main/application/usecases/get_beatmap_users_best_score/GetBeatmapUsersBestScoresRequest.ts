import {ModPatternCollection} from '../../../primitives/ModPatternCollection';
import {OsuServer} from '../../../primitives/OsuServer';

export type GetBeatmapUsersBestScoresRequest = {
  initiatorAppUserId: string;
  server: OsuServer;
  beatmapId: number;
  usernames: string[];
  startPosition: number;
  quantityPerUser: number;
  modPatterns: ModPatternCollection;
};
