import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuServer} from '../../../primitives/OsuServer';

export type GetBeatmapUsersBestScoresRequest = {
  appUserId: string;
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
