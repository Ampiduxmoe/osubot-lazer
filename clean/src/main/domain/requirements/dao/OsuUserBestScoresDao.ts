import {OsuServer} from '../../../../primitives/OsuServer';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {UserBestScoreInfo} from '../../../data/raw/http/boundary/UserBestScoreInfo';

export interface OsuUserBestScoresDao {
  get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    mods: {
      acronym: string;
      isOptional: boolean;
    }[],
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<UserBestScore[]>;
}

export type UserBestScore = UserBestScoreInfo & {
  absolutePosision: number;
};
