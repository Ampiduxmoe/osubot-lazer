import {Timespan} from '../../../../../primitives/Timespan';
import {RawOauthToken} from './RawOauthToken';
import {JsonCacheDescriptor} from '../../../../../primitives/JsonCacheDescriptor';

export class OsuOauthAccessToken {
  readonly tokenType: string;
  readonly grantTime: number;
  readonly expirationTime: number;
  readonly value: string;

  constructor(
    tokenType: string,
    grantTime: number,
    expirationTime: number,
    value: string
  ) {
    this.tokenType = tokenType;
    this.grantTime = grantTime;
    this.expirationTime = expirationTime;
    this.value = value;
  }

  static FromRawToken(rawToken: RawOauthToken): OsuOauthAccessToken {
    const tokenType = rawToken.token_type;
    const grantTime = Date.now();
    const tokenDuration = new Timespan().addSeconds(rawToken.expires_in);
    const expirationTime = grantTime + tokenDuration.totalMiliseconds();
    const value = rawToken.access_token;
    return new OsuOauthAccessToken(tokenType, grantTime, expirationTime, value);
  }

  private static FromJsonForm(
    jsonForm: OsuOauthAccessTokenJson
  ): OsuOauthAccessToken {
    return new OsuOauthAccessToken(
      jsonForm.tokenType,
      jsonForm.grantTime,
      jsonForm.expirationTime,
      jsonForm.value
    );
  }

  isValid(safetyMargin = new Timespan()): boolean {
    const now = Date.now();
    return now < this.expirationTime - safetyMargin.totalMiliseconds();
  }

  static JsonCacheDescriptor: JsonCacheDescriptor<OsuOauthAccessToken> = {
    key: 'osu_oauth_access_token',
    serialize: function (o: OsuOauthAccessToken): string {
      const jsonForm: OsuOauthAccessTokenJson = {
        tokenType: o.tokenType,
        grantTime: o.grantTime,
        expirationTime: o.expirationTime,
        value: o.value,
      };
      return JSON.stringify(jsonForm);
    },
    deserialize: function (s: string): OsuOauthAccessToken | undefined {
      const jsonForm: OsuOauthAccessToken = JSON.parse(s);
      try {
        return OsuOauthAccessToken.FromJsonForm(jsonForm);
      } catch (e) {
        console.log(e);
        return undefined;
      }
    },
  };
}

type OsuOauthAccessTokenJson = {
  tokenType: string;
  grantTime: number;
  expirationTime: number;
  value: string;
};
