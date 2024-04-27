import axios from 'axios';
import {OsuOauthAccessToken} from '../OsuOauthAccessToken';
import {Timespan} from '../../../../../../primitives/Timespan';
import {BanchoUsers} from './users/BanchoUsers';

export class BanchoClient {
  private ouathClientId: number;
  private oauthClientSecret: string;
  private httpClient = axios.create({
    baseURL: 'https://osu.ppy.sh/api/v2',
    timeout: 4e3,
    validateStatus: function (status: number) {
      if (status === 200) {
        return true;
      }
      if (status === 404) {
        return true;
      }
      return false;
    },
  });
  private ouathToken: OsuOauthAccessToken | undefined = undefined;
  private tokenSafetyMargin = new Timespan().addHours(1);

  users = new BanchoUsers(async () => {
    await this.refreshTokenIfNeeded();
    return this.httpClient;
  });

  constructor(ouathClientId: number, oauthClientSecret: string) {
    this.ouathClientId = ouathClientId;
    this.oauthClientSecret = oauthClientSecret;
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (
      this.ouathToken === undefined ||
      !this.ouathToken.isValid(this.tokenSafetyMargin)
    ) {
      await this.refreshToken();
    }
  }

  private async refreshToken() {
    console.log(`Refreshing ${BanchoClient.name} OAuth token...`);
    const token = await this.fetchToken();
    this.trySetToken(token);
  }

  private async fetchToken(): Promise<OsuOauthAccessToken> {
    const body = {
      client_id: this.ouathClientId,
      client_secret: this.oauthClientSecret,
      grant_type: 'client_credentials',
      scope: 'public',
    };
    const response = await axios.post('https://osu.ppy.sh/oauth/token', body);
    const rawToken = response.data;
    const token = new OsuOauthAccessToken(rawToken);
    /*
      TODO: cache token
    */
    return token;
  }

  private trySetToken(token: OsuOauthAccessToken) {
    if (!token.isValid(this.tokenSafetyMargin)) {
      console.log('Can not set OAuth token: potential expiration date reached');
      return;
    }
    this.ouathToken = token;
    this.httpClient.defaults.headers.common[
      'Authorization'
    ] = `Bearer ${token.value}`;
    console.log('Sucessfully set token!');
  }
}
