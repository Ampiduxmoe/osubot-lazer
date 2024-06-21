import {OsuServer} from '../../../../primitives/OsuServer';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {UserBestScoreInfo} from '../../../data/http/boundary/UserBestScoreInfo';
import {ModAcronym} from '../../../../primitives/ModAcronym';

export interface OsuUserBestScoresDao {
  get(
    appUserId: string,
    osuUserId: number,
    server: OsuServer,
    mods: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[],
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<UserBestScore[]>;
}

export type UserBestScore = UserBestScoreInfo & {
  absolutePosition: number;
};
