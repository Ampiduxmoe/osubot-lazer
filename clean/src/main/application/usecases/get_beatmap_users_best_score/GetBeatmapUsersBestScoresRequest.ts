import {ModAcronym} from '../../../../primitives/ModAcronym';
import {OsuServer} from '../../../../primitives/OsuServer';

export type GetBeatmapUsersBestScoresRequest = {
  appUserId: string;
  server: OsuServer;
  beatmapId: number;
  usernames: string[];
  quantityPerUser: number;
  mods: {
    acronym: ModAcronym;
    isOptional: boolean;
  }[];
};
