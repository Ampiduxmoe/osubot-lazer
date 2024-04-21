import {OsuServer} from '../../../../../primitives/OsuServer';

export interface OsuIdAndUsernameKey {
  username: string;
  server: OsuServer;
}

export type OsuIdAndUsername = OsuIdAndUsernameKey & {
  id: number;
};
