import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../../primitives/OsuServer';

export type OsuUserSnapshotKey = {
  username: string;
  server: OsuServer;
};

export type OsuUserSnapshot = OsuUserSnapshotKey & {
  id: number;
  preferred_mode: OsuRuleset;
};
