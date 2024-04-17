import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from './base/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {GetUserInfoUseCase} from '../../../domain/usecases/get_user_info/GetUserInfoUseCase';

export class UserInfo extends VkCommand<
  UserInfoExecutionParams,
  UserInfoViewParams
> {
  getUserInfo: GetUserInfoUseCase;

  constructor(getRecentPlays: GetUserInfoUseCase) {
    super();
    this.getUserInfo = getRecentPlays;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserInfoExecutionParams> {
    const fail = CommandMatchResult.fail<UserInfoExecutionParams>();
    if (!ctx.hasText) {
      return fail;
    }
    const text = ctx.text!;
    const tokens = text.split(' ');
    if (tokens[0] !== 'test') {
      return fail;
    }
    const server = {
      l: OsuServer.Bancho,
    }[tokens[1]];
    const username = tokens[2];

    if (server === undefined || username === undefined) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: server,
      username: username,
    });
  }

  async process(params: UserInfoExecutionParams): Promise<UserInfoViewParams> {
    const userInfo = await this.getUserInfo.execute({
      server: params.server,
      username: params.username,
    });
    return {
      server: params.server,
      username: userInfo.username,
      pp: userInfo.pp,
    };
  }

  createOutputMessage(params: UserInfoViewParams): VkOutputMessage {
    const server = params.server;
    const username = params.username;
    const pp = params.pp;
    return {
      text: `Server: ${OsuServer[server]}, username: ${username}, pp: ${pp}`,
      attachment: undefined,
      buttons: [[]],
    };
  }
}

interface UserInfoExecutionParams {
  server: OsuServer;
  username: string;
}

interface UserInfoViewParams {
  server: OsuServer;
  username: string;
  pp: number;
}
