import {IAppConfig} from './IAppConfig';
import {IOsuOauthAccessTokenReadDto} from './oauth/IOsuOauthAccessTokenReadDto';
import {OsuOauthAccessToken} from './oauth/OsuOauthAccessToken';
import axios from 'axios';

export class App {
  readonly config: IAppConfig;

  ouathToken: OsuOauthAccessToken | undefined;

  httpClient = axios.create({
    baseURL: 'https://osu.ppy.sh/api/v2',
    timeout: 4e3,
  });

  constructor(config: IAppConfig) {
    this.config = config;
    console.log('App init');
  }

  start() {
    console.log('App started!');
    this.refreshToken();
  }

  async refreshToken() {
    console.log('Refreshing OAuth token...');
    const body = {
      client_id: this.config.osu.oauth.id,
      client_secret: this.config.osu.oauth.secret,
      grant_type: 'client_credentials',
      scope: 'public',
    };
    const response = await axios.post('https://osu.ppy.sh/oauth/token', body);
    if (response.status !== 200) {
      return;
    }
    const rawToken: IOsuOauthAccessTokenReadDto = response.data;
    this.ouathToken = new OsuOauthAccessToken(rawToken);
    console.log('Sucessfully refreshed token!');
    console.log(this.ouathToken);
  }
}
