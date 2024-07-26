import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuServer} from '../../../primitives/OsuServer';

export type GetBeatmapUsersBestScoresRequest = {
  initiatorAppUserId: string;
  server: OsuServer;
  beatmapId: number;
  usernames: string[];
  startPosition: number;
  quantityPerUser: number;
  mods: {
    acronym: ModAcronym;
    isOptional: boolean;
  }[];
};
