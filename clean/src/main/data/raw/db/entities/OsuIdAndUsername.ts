import {OsuServer} from '../../../../../primitives/OsuServer';

export type OsuIdAndUsernameKey = {
  username: string;
  server: OsuServer;
};

export type OsuIdAndUsername = OsuIdAndUsernameKey & {
  id: number;
};
