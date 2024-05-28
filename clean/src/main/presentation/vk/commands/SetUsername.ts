import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {SetUsernameUseCase} from '../../../domain/usecases/set_username/SetUsernameUseCase';
import {VkIdConverter} from '../VkIdConverter';
import {
  MODE,
  OWN_COMMAND_PREFIX,
  SERVER_PREFIX,
  USERNAME,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {CommandPrefixes} from '../../common/CommandPrefixes';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export class SetUsername extends VkCommand<
  SetUsernameExecutionArgs,
  SetUsernameViewParams
> {
  internalName = SetUsername.name;
  shortDescription = 'установить ник';
  longDescription = 'Привязывает игровой никнейм к вашему аккаунту ВК';

  static prefixes = new CommandPrefixes('n', 'nickname');
  prefixes = SetUsername.prefixes;

  private COMMAND_PREFIX = new OWN_COMMAND_PREFIX(this.prefixes);
  commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: false},
    {argument: MODE, isOptional: true},
  ];

  setUsername: SetUsernameUseCase;
  constructor(setUsername: SetUsernameUseCase) {
    super();
    this.setUsername = setUsername;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<SetUsernameExecutionArgs> {
    const fail = CommandMatchResult.fail<SetUsernameExecutionArgs>();
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
    const commandPrefix = argsProcessor
      .use(this.COMMAND_PREFIX)
      .at(0)
      .extract();
    const mode = argsProcessor.use(MODE).extract();
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
    if (server === undefined || commandPrefix === undefined) {
      return fail;
    }
    if (!this.prefixes.matchIgnoringCase(commandPrefix)) {
      return fail;
    }
    return CommandMatchResult.ok({
      vkUserId: ctx.senderId,
      server: server,
      username: username,
      mode: mode,
    });
  }

  async process(
    args: SetUsernameExecutionArgs
  ): Promise<SetUsernameViewParams> {
    if (args.username === undefined) {
      return {
        server: args.server,
        usernameInput: undefined,
        username: undefined,
        mode: args.mode,
      };
    }
    const result = await this.setUsername.execute({
      appUserId: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
      server: args.server,
      username: args.username,
      mode: args.mode,
    });
    if (result.isFailure) {
      const internalFailureReason = result.failureReason!;
      switch (internalFailureReason) {
        case 'user not found':
          return {
            server: args.server,
            usernameInput: args.username,
            username: undefined,
            mode: args.mode,
          };
        default:
          throw Error('Switch case is not exhaustive');
      }
    }
    return {
      server: args.server,
      usernameInput: args.username,
      username: result.username!,
      mode: result.mode!,
    };
  }

  createOutputMessage(params: SetUsernameViewParams): VkOutputMessage {
    const {server, usernameInput, username, mode} = params;
    if (username === undefined) {
      if (usernameInput === undefined) {
        return this.createUsernameNotSpecifiedMessage(server);
      }
      return this.createUserNotFoundMessage(server, usernameInput);
    }
    return this.createUsernameSetMessage(server, username, mode!);
  }

  createUsernameNotSpecifiedMessage(server: OsuServer): VkOutputMessage {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Не указан ник!
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Пользователь с ником ${usernameInput} не найден
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createUsernameSetMessage(
    server: OsuServer,
    username: string,
    mode: OsuRuleset
  ) {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const text = `
[Server: ${serverString}]
Установлен ник ${username} (режим: ${modeString})
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }
}

type SetUsernameExecutionArgs = {
  vkUserId: number;
  server: OsuServer;
  username: string | undefined;
  mode: OsuRuleset | undefined;
};

type SetUsernameViewParams = {
  server: OsuServer;
  usernameInput: string | undefined;
  username: string | undefined;
  mode: OsuRuleset | undefined;
};
