import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from './base/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand, CommandPrefixes} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {SetUsernameUseCase} from '../../../domain/usecases/set_username/SetUsernameUseCase';
import {VkIdConverter} from '../VkIdConverter';
import {
  COMMAND_PREFIX,
  SERVER_PREFIX,
  USERNAME,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';

export class SetUsername extends VkCommand<
  SetUsernameExecutionParams,
  SetUsernameViewParams
> {
  internalName = SetUsername.name;
  shortDescription = 'установить ник';

  static prefixes = new CommandPrefixes(['n', 'nickname', 'username']);
  prefixes = SetUsername.prefixes;

  commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: false},
  ];

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
    if (ctx.hasMessagePayload && ctx.messagePayload!.target === APP_CODE_NAME) {
      command = ctx.messagePayload!.command;
    } else if (ctx.hasText) {
      command = ctx.text!;
    }
    if (command === undefined) {
      return fail;
    }

    const splitSequence = ' ';
    const tokens = command.split(splitSequence);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const commandPrefix = argsProcessor.use(COMMAND_PREFIX).at(0).extract();
    const usernameParts: string[] = [];
    let usernamePart = argsProcessor.use(USERNAME).extract();
    while (usernamePart !== undefined) {
      usernameParts.push(usernamePart);
      usernamePart = argsProcessor.use(USERNAME).extract();
    }
    const username =
      usernameParts.length === 0
        ? undefined
        : usernameParts.join(splitSequence);

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (
      server === undefined ||
      commandPrefix === undefined ||
      username === undefined
    ) {
      return fail;
    }
    if (!this.prefixes.matchIgnoringCase(commandPrefix)) {
      return fail;
    }
    return CommandMatchResult.ok({
      vkUserId: ctx.senderId,
      server: server,
      usernameInput: username,
    });
  }

  async process(
    params: SetUsernameExecutionParams
  ): Promise<SetUsernameViewParams> {
    const result = await this.setUsername.execute({
      id: VkIdConverter.vkUserIdToAppUserId(params.vkUserId),
      server: params.server,
      username: params.usernameInput,
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
  usernameInput: string;
}

interface SetUsernameViewParams {
  server: OsuServer;
  username?: string;
  failureReason?: SetUsernameFailureReason;
}

type SetUsernameFailureReason = 'user not found';
