import {
  Auth,
  Client,
  OsuJSUnexpectedResponseError,
  UserExtended,
  UserScore,
} from 'osu-web.js';
import {OsuOauthAccessToken} from '../OsuOauthAccessToken';
import {OsuApi} from '../OsuAPI';
import {OsuServer} from '../../../../../primitives/OsuServer';

export class BanchoApi implements OsuApi {
  private ouathClientId: number;
  private oauthClientSecret: string;
  private ouathToken: OsuOauthAccessToken | undefined = undefined;

  private client: Client = new Client('');

  constructor(ouathClientId: number, oauthClientSecret: string) {
    this.ouathClientId = ouathClientId;
    this.oauthClientSecret = oauthClientSecret;
  }

  server: OsuServer = OsuServer.Bancho;

  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.ouathToken === undefined || !this.ouathToken.isValid()) {
      await this.refreshToken();
    }
  }

  private async refreshToken() {
    console.log('Refreshing Bancho OAuth token...');
    const token = await this.fetchToken();
    this.trySetToken(token);
  }

  private async fetchToken(): Promise<OsuOauthAccessToken> {
    const auth = new Auth(this.ouathClientId, this.oauthClientSecret, '');
    const rawToken = await auth.clientCredentialsGrant();
    const token = new OsuOauthAccessToken(rawToken);
    /*
      TODO: cache token
    */
    return token;
  }

  private trySetToken(token: OsuOauthAccessToken) {
    if (!token.isValid()) {
      console.log('Can not set OAuth token: expiration date reached');
      return;
    }
    this.ouathToken = token;
    this.client = new Client(token.value);
    console.log('Sucessfully set token!');
  }

  async getUser(username: string): Promise<UserExtended | undefined> {
    console.log(`Trying to fetch Bancho user ${username}`);
    await this.refreshTokenIfNeeded();
    let user: UserExtended;
    try {
      user = await this.client.users.getUser(username);
    } catch (e) {
      if (
        e instanceof OsuJSUnexpectedResponseError &&
        e.response().status === 404
      ) {
        return undefined;
      }
      throw e;
    }
    return user;
  }

  async getRecentPlays(
    osuId: number,
    includeFails: boolean,
    offset: number,
    quantity: number
  ): Promise<UserScore[]> {
    console.log(`Trying to get recent plays on Bancho for ${osuId}...`);
    await this.refreshTokenIfNeeded();
    const scores = await this.client.users.getUserScores(osuId, 'recent', {
      query: {
        mode: 'osu',
        offset: offset,
        limit: quantity,
        include_fails: includeFails,
      },
    });
    return scores;
  }
}
