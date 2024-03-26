import {Timespan} from '../primitives/Timespan';
import {IOsuOauthAccessTokenReadDto} from './IOsuOauthAccessTokenReadDto';

export class OsuOauthAccessToken {
  readonly tokenType: string;
  readonly grantDate: Date;
  readonly tokenDuration: Timespan;
  readonly expirationDate: Date;
  readonly value: string;

  constructor(rawToken: IOsuOauthAccessTokenReadDto) {
    this.tokenType = rawToken.token_type;
    this.grantDate = new Date();
    this.tokenDuration = new Timespan().addSeconds(rawToken.expires_in);
    this.expirationDate = new Date(
      this.grantDate.getTime() + this.tokenDuration.totalMiliseconds()
    );
    this.value = rawToken.access_token;
  }

  isValid(): boolean {
    const now = new Date();
    return now < this.expirationDate;
  }
}
