import {Timespan} from '../../../../../primitives/Timespan';
import {RawOauthToken} from './RawOauthToken';

export class OsuOauthAccessToken {
  readonly tokenType: string;
  readonly grantTime: number;
  readonly expirationTime: number;
  readonly value: string;

  constructor(rawToken: RawOauthToken) {
    this.tokenType = rawToken.token_type;
    this.grantTime = Date.now();
    const tokenDuration = new Timespan().addSeconds(rawToken.expires_in);
    this.expirationTime = this.grantTime + tokenDuration.totalMiliseconds();
    this.value = rawToken.access_token;
  }

  isValid(safetyMargin = new Timespan()): boolean {
    const now = Date.now();
    return now < this.expirationTime - safetyMargin.totalMiliseconds();
  }
}
