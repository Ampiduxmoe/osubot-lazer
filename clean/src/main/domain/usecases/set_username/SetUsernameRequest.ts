import {OsuServer} from '../../../../primitives/OsuServer';

export type SetUsernameRequest = {
  appUserId: string;
  server: OsuServer;
  username: string;
};
