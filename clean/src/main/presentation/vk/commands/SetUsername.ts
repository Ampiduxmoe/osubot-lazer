import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {SetUsernameUseCase} from '../../../application/usecases/set_username/SetUsernameUseCase';
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
import {TextProcessor} from '../../common/arg_processing/TextProcessor';

export class SetUsername extends VkCommand<
  SetUsernameExecutionArgs,
  SetUsernameViewParams
> {
  internalName = SetUsername.name;
  shortDescription = 'установить ник';
  longDescription = 'Привязывает игровой никнейм к вашему аккаунту ВК';

  static prefixes = new CommandPrefixes('n', 'Nickname');
  prefixes = SetUsername.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = SetUsername.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: false},
    {argument: MODE, isOptional: true},
  ];

  textProcessor: TextProcessor;
  setUsername: SetUsernameUseCase;
  constructor(textProcessor: TextProcessor, setUsername: SetUsernameUseCase) {
    super(SetUsername.commandStructure);
    this.textProcessor = textProcessor;
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

    const tokens = this.textProcessor.tokenize(command);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    const mode = argsProcessor.use(MODE).extract();
    const username = argsProcessor.use(USERNAME).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (server === undefined || ownPrefix === undefined) {
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
