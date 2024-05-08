import {OsuServer} from '../../../../primitives/OsuServer';

export type GetOsuUserInfoRequest = {
  appUserId: string;
  server: OsuServer;
  username: string;
};
