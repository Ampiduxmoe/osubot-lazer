import {IScore} from '../../dtos/osu/scores/IScore';
import {IUserExtended} from '../../dtos/osu/users/IUserExtended';
import {Result} from '../../primitives/Result';
import {IOsuServerApi} from '../IOsuServerApi';
import axios from 'axios';
import {IOsuOauthAccessTokenReadDto} from '../../../src/oauth/IOsuOauthAccessTokenReadDto';
import {OsuOauthAccessToken} from '../../oauth/OsuOauthAccessToken';
import {catchedValueToError} from '../../primitives/Errors';
import {IScores} from '../../../src/dtos/osu/scores/IScores';

export class BanchoApi implements IOsuServerApi {
  private ouathClientId: number;
  private oauthClientSecret: string;
  private ouathToken: OsuOauthAccessToken | undefined = undefined;

  private apiv2httpClient = axios.create({
    baseURL: 'https://osu.ppy.sh/api/v2',
    timeout: 4e3,
    validateStatus: function () {
      return true;
    },
  });

  constructor(ouathClientId: number, oauthClientSecret: string) {
    this.ouathClientId = ouathClientId;
    this.oauthClientSecret = oauthClientSecret;
  }

  async refreshTokenIfNeeded(): Promise<void> {
    if (this.ouathToken === undefined || !this.ouathToken.isValid()) {
      await this.refreshToken();
    }
  }

  async refreshToken() {
    console.log('Refreshing Bancho OAuth token...');
    try {
      const body = {
        client_id: this.ouathClientId,
        client_secret: this.oauthClientSecret,
        grant_type: 'client_credentials',
        scope: 'public',
      };
      const response = await axios.post('https://osu.ppy.sh/oauth/token', body);
      const rawToken: IOsuOauthAccessTokenReadDto = response.data;
      this.ouathToken = new OsuOauthAccessToken(rawToken);
      this.apiv2httpClient.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${rawToken.access_token}`;
      console.log('Sucessfully refreshed token!');
    } catch (e) {
      console.log('Could not fetch new token');
      console.log(e);
    }
  }

  async getUser(username: string): Promise<Result<IUserExtended | undefined>> {
    console.log(`Trying to fetch Bancho user ${username}`);
    await this.refreshTokenIfNeeded();
    try {
      const url = `users/${username}/osu`;
      const response = await this.apiv2httpClient.get(url);
      if (response.status === 401) {
        console.log('Received 401 status, invalidating token now');
        this.ouathToken = undefined;
        const errorText = `Could not fetch Bancho user ${username}: current OAuth token is not valid`;
        console.log(errorText);
        return Result.fail([Error(errorText)]);
      }
      if (response.status === 404) {
        console.log(`Bancho user with username ${username} was not found`);
        return Result.ok(undefined);
      }
      if (response.status !== 200) {
        const errorText = `Could not fetch Bancho user ${username}, response status was ${response.status}`;
        console.log(errorText);
        return Result.fail([Error(errorText)]);
      }
      const rawUser: IUserExtended = response.data;
      return Result.ok(rawUser);
    } catch (e) {
      console.log(e);
      const internalError = catchedValueToError(e);
      const fallbackError = Error(
        'Error has occured that did not match any known error type'
      );
      const finalError = internalError || fallbackError;
      return Result.fail([finalError]);
    }
  }

  async gerRecentPlays(
    osu_id: number,
    offset: number,
    limit: number
  ): Promise<Result<IScore[]>> {
    console.log(`Trying to get recent plays on Bancho for ${osu_id}...`);
    await this.refreshTokenIfNeeded();
    try {
      const response = await this.apiv2httpClient.get(
        `users/${osu_id}/scores/recent`,
        {
          params: {
            include_fails: 1,
            mode: 'osu',
            offset: offset,
            limit: limit,
          },
        }
      );
      if (response.status === 401) {
        console.log('Received 401 status, invalidating token now');
        this.ouathToken = undefined;
        const errorText = `Could not fetch recent play on Bancho for ${osu_id}: current OAuth token is not valid`;
        console.log(errorText);
        return Result.fail([Error(errorText)]);
      }
      if (response.status !== 200) {
        const errorText = `Could not fetch recent play on Bancho for ${osu_id}, response status was ${response.status}`;
        console.log(errorText);
        return Result.fail([Error(errorText)]);
      }
      const rawScores: IScores = response.data;
      console.log(
        `Number of fetched recent plays on Bancho for ${osu_id}: ${rawScores.length}`
      );
      return Result.ok(rawScores);
    } catch (e) {
      console.log(e);
      const internalError = catchedValueToError(e);
      const fallbackError = Error(
        'Error has occured that did not match any known error type'
      );
      const finalError = internalError || fallbackError;
      return Result.fail([finalError]);
    }
  }

  async getBestPlays(
    osu_id: number,
    offset: number,
    limit: number
  ): Promise<Result<IScore[]>> {
    console.log(`Trying to get best plays on Bancho for ${osu_id}...`);
    await this.refreshTokenIfNeeded();
    try {
      const response = await this.apiv2httpClient.get(
        `users/${osu_id}/scores/best`,
        {
          params: {
            mode: 'osu',
            offset: offset,
            limit: limit,
          },
        }
      );
      if (response.status === 401) {
        console.log('Received 401 status, invalidating token now');
        this.ouathToken = undefined;
        const errorText = `Could not fetch best plays on Bancho for ${osu_id}: current OAuth token is not valid`;
        console.log(errorText);
        return Result.fail([Error(errorText)]);
      }
      if (response.status !== 200) {
        const errorText = `Could not fetch best plays on Bancho for ${osu_id}, response status was ${response.status}`;
        console.log(errorText);
        return Result.fail([Error(errorText)]);
      }
      const rawScores: IScores = response.data;
      console.log(
        `Number of fetched top plays on Bancho for ${osu_id}: ${rawScores.length}`
      );
      return Result.ok(rawScores);
    } catch (e) {
      console.log(e);
      const internalError = catchedValueToError(e);
      const fallbackError = Error(
        'Error has occured that did not match any known error type'
      );
      const finalError = internalError || fallbackError;
      return Result.fail([finalError]);
    }
  }
}
