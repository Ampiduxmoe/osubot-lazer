import {IScore} from '../../dtos/osu/scores/IScore';
import {IUserExtended} from '../../dtos/osu/users/IUserExtended';
import {Result} from '../../primitives/Result';
import {IOsuServerApi} from '../IOsuServerApi';
import axios from 'axios';
import {IOsuOauthAccessTokenReadDto} from '../../../src/oauth/IOsuOauthAccessTokenReadDto';
import {OsuOauthAccessToken} from '../../oauth/OsuOauthAccessToken';
import {catchedValueToError} from '../../primitives/Errors';
import {IScores} from '../../../src/dtos/osu/scores/IScores';
import {JsonCache} from '../../bot/database/modules/JsonCache';

export class BanchoApi implements IOsuServerApi {
  private rawTokenCacheId = 'raw_osu_oauth_token';
  private ouathClientId: number;
  private oauthClientSecret: string;
  private _jsonCache: JsonCache | undefined;
  private get jsonCache(): JsonCache {
    if (this._jsonCache === undefined) {
      throw Error('Variable jsonCache must be initialized before any use');
    }
    return this._jsonCache;
  }
  private ouathToken: OsuOauthAccessToken | undefined = undefined;

  private apiv2httpClient = axios.create({
    baseURL: 'https://osu.ppy.sh/api/v2',
    timeout: 4e3,
    validateStatus: function () {
      return true;
    },
  });

  constructor(
    ouathClientId: number,
    oauthClientSecret: string,
    jsonCache: Promise<JsonCache>
  ) {
    this.ouathClientId = ouathClientId;
    this.oauthClientSecret = oauthClientSecret;
    jsonCache.then(cache => {
      this._jsonCache = cache;
      cache
        .validateAndGet<IOsuOauthAccessTokenReadDto>({
          object_name: this.rawTokenCacheId,
          validate: t =>
            Boolean(t.token_type && t.expires_in && t.access_token),
        })
        .then(rawToken => {
          if (rawToken !== undefined) {
            console.log('Attempting to use cached OAuth token...');
            this.trySetToken(rawToken);
          }
        });
    });
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.ouathToken === undefined || !this.ouathToken.isValid()) {
      await this.refreshToken();
    }
  }

  private async refreshToken() {
    console.log('Refreshing Bancho OAuth token...');
    try {
      const rawToken = await this.fetchToken();
      this.trySetToken(rawToken);
    } catch (e) {
      console.log('Could not fetch new token');
      console.log(e);
    }
  }

  private async fetchToken(): Promise<IOsuOauthAccessTokenReadDto> {
    const body = {
      client_id: this.ouathClientId,
      client_secret: this.oauthClientSecret,
      grant_type: 'client_credentials',
      scope: 'public',
    };
    const response = await axios.post('https://osu.ppy.sh/oauth/token', body);
    const rawToken = response.data;
    const oldTokenCache = await this.jsonCache.getByName(this.rawTokenCacheId);
    if (oldTokenCache !== undefined) {
      await this.jsonCache.delete(oldTokenCache);
    }
    await this.jsonCache.add({
      object_name: this.rawTokenCacheId,
      json_string: JSON.stringify(rawToken),
    });
    return rawToken;
  }

  private trySetToken(rawToken: IOsuOauthAccessTokenReadDto) {
    const token = new OsuOauthAccessToken(rawToken);
    if (!token.isValid()) {
      console.log('Can not set OAuth token: expiration date reached');
      return;
    }
    this.ouathToken = token;
    this.apiv2httpClient.defaults.headers.common[
      'Authorization'
    ] = `Bearer ${rawToken.access_token}`;
    console.log('Sucessfully set token!');
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
