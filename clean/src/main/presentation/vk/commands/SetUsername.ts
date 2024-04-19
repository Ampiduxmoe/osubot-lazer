import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from './base/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand, CommandPrefixes} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {SERVERS} from './base/OsuServers';
import {SetUsernameUseCase} from '../../../domain/usecases/set_username/SetUsernameUseCase';
import {VkIdConverter} from '../VkIdConverter';

export class SetUsername extends VkCommand<
  SetUsernameExecutionParams,
  SetUsernameViewParams
> {
  static prefixes = new CommandPrefixes(['n', 'nickname', 'username']);
  prefixes = SetUsername.prefixes;
  setUsername: SetUsernameUseCase;

  constructor(setUsername: SetUsernameUseCase) {
    super();
    this.setUsername = setUsername;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<SetUsernameExecutionParams> {
    const fail = CommandMatchResult.fail<SetUsernameExecutionParams>();
    let command: string | undefined = undefined;
    if (ctx.hasMessagePayload && ctx.messagePayload!.traget === APP_CODE_NAME) {
      command = ctx.messagePayload!.command;
    } else if (ctx.hasText) {
      command = ctx.text!;
    }
    if (command === undefined) {
      return fail;
    }

    const tokens = command.split(' ');

    const server = SERVERS.getServerByPrefixIgnoringCase(tokens[0]);
    if (server === undefined) {
      return fail;
    }
    const commandPrefix = tokens[1] || '';
    if (!this.prefixes.matchIgnoringCase(commandPrefix)) {
      return fail;
    }
    const username = tokens[2];
    if (username === undefined) {
      return fail;
    }
    return CommandMatchResult.ok({
      vkUserId: ctx.senderId,
      server: server,
      username: username,
    });
  }

  async process(
    params: SetUsernameExecutionParams
  ): Promise<SetUsernameViewParams> {
    const result = await this.setUsername.execute({
      id: VkIdConverter.vkUserIdToAppUserId(params.vkUserId),
      server: params.server,
      username: params.username,
    });
    if (result.isFailure) {
      const internalFailureReason = result.failureReason!;
      let failureReason: SetUsernameFailureReason;
      switch (internalFailureReason) {
        case 'user not found':
          failureReason = 'user not found';
          break;
        default:
          throw Error('Switch case is not exhaustive');
      }
      return {
        server: params.server,
        failureReason: failureReason,
      };
    }
    const username = result.username!;
    return {
      server: params.server,
      username: username,
    };
  }

  createOutputMessage(params: SetUsernameViewParams): VkOutputMessage {
    const serverString = OsuServer[params.server];
    const {username} = params;

    const text = `
[Server: ${serverString}]
Установлен ник ${username}
    `.trim();

    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }
}

interface SetUsernameExecutionParams {
  vkUserId: number;
  server: OsuServer;
  username: string;
}

interface SetUsernameViewParams {
  server: OsuServer;
  username?: string;
  failureReason?: SetUsernameFailureReason;
}

type SetUsernameFailureReason = 'user not found';
