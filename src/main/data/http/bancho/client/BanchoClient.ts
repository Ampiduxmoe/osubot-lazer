import axios, {AxiosInstance} from 'axios';
import {withTimingLogs} from '../../../../primitives/LoggingFunctions';
import {Timespan} from '../../../../primitives/Timespan';
import {OsuOauthAccessToken} from '../OsuOauthAccessToken';
import {BanchoBeatmaps} from './beatmaps/BanchoBeatmaps';
import {BanchoBeatmapsets} from './beatmapsets/BanchoBeatmapsets';
import {BanchoUsers} from './users/BanchoUsers';

export class BanchoClient {
  private ouathClientId: number;
  private oauthClientSecret: string;
  private saveOuathToken: (t: OsuOauthAccessToken) => Promise<void>;
  private httpClient: AxiosInstance;
  private ouathToken: OsuOauthAccessToken | undefined = undefined;
  private tokenSafetyMargin = new Timespan().addHours(1);

  private getHttpClient = async () => {
    await this.refreshTokenIfNeeded();
    return this.httpClient;
  };
  users = new BanchoUsers(this.getHttpClient);
  beatmaps = new BanchoBeatmaps(this.getHttpClient);
  beatmapsets = new BanchoBeatmapsets(this.getHttpClient);

  constructor(config: BanchoClientConfig) {
    this.ouathClientId = config.ouathClientId;
    this.oauthClientSecret = config.oauthClientSecret;

    this.httpClient = axios.create({
      baseURL: 'https://osu.ppy.sh/api/v2',
      timeout: config.timeout,
      validateStatus: (status: number) => {
        if (status === 200) {
          return true;
        }
        if (status === 404) {
          return true;
        }
        if (status === 401) {
          this.ouathToken = undefined;
          return false;
        }
        return false;
      },
    });

    this.saveOuathToken = config.saveOuathToken;
    config.loadLatestOuathToken().then(token => {
      if (token === undefined) {
        return;
      }
      this.trySetToken(token);
    });
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (
      this.ouathToken === undefined ||
      !this.ouathToken.isValid(this.tokenSafetyMargin)
    ) {
      await this.refreshToken();
    }
  }

  private _tokenRefreshPromise: Promise<void> | undefined = undefined;
  private async refreshToken(): Promise<void> {
    this._tokenRefreshPromise ??= withTimingLogs(
      async () => this.trySetToken(await this.fetchTokenAndSave()),
      () => `Refreshing ${BanchoClient.name} OAuth token...`,
      (_, delta) => `Token refresh for ${BanchoClient.name} done in ${delta}ms`
    );
    await this._tokenRefreshPromise;
    this._tokenRefreshPromise = undefined;
  }

  private async fetchTokenAndSave(): Promise<OsuOauthAccessToken> {
    const body = {
      client_id: this.ouathClientId,
      client_secret: this.oauthClientSecret,
      grant_type: 'client_credentials',
      scope: 'public',
    };
    const response = await axios.post('https://osu.ppy.sh/oauth/token', body);
    const rawToken = response.data;
    const token = OsuOauthAccessToken.FromRawToken(rawToken);
    await this.saveOuathToken(token);
    return token;
  }

  private trySetToken(token: OsuOauthAccessToken): void {
    if (!token.isValid(this.tokenSafetyMargin)) {
      console.log('Can not set OAuth token: potential expiration date reached');
      return;
    }
    this.ouathToken = token;
    this.httpClient.defaults.headers.common['Authorization'] =
      `Bearer ${token.value}`;
    console.log('Sucessfully set token!');
  }
}

type BanchoClientConfig = {
  ouathClientId: number;
  oauthClientSecret: string;
  timeout: number;
  saveOuathToken: (t: OsuOauthAccessToken) => Promise<void>;
  loadLatestOuathToken: () => Promise<OsuOauthAccessToken | undefined>;
};
