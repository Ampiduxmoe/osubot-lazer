import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {CommandPrefixes, VkCommand} from './base/VkCommand';
import {GetRecentPlaysUseCase} from '../../../domain/usecases/get_recent_plays/GetRecentPlaysUseCase';
import {OsuServer} from '../../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {SERVERS} from '../../common/OsuServers';
import {GetAppUserInfoUseCase} from '../../../domain/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {VkIdConverter} from '../VkIdConverter';
import {clamp} from '../../../../primitives/Numbers';
import {OsuUserRecentPlays} from '../../../domain/usecases/get_recent_plays/GetRecentPlaysResponse';
import {
  OWN_COMMAND_PREFIX,
  MODS,
  QUANTITY,
  SERVER_PREFIX,
  START_POSITION,
  USERNAME,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';

export class UserRecentPlays extends VkCommand<
  UserRecentPlaysExecutionArgs,
  UserRecentPlaysViewParams
> {
  internalName = UserRecentPlays.name;
  shortDescription = 'последние скоры';
  longDescription =
    'Отображает последние скоры игрока\n' +
    'Используйте ' +
    UserRecentPlays.recentPlaysPrefixes.map(s => `"${s}"`).join(' или ') +
    ' для всех скоров, и ' +
    UserRecentPlays.recentPassesPrefixes.map(s => `"${s}"`).join(' или ') +
    ' для пассов';

  static recentPlaysPrefixes = new CommandPrefixes('r', 'recent');
  static recentPassesPrefixes = new CommandPrefixes('rp', 'recentpass');
  static prefixes = new CommandPrefixes(
    ...UserRecentPlays.recentPlaysPrefixes,
    ...UserRecentPlays.recentPassesPrefixes
  );
  prefixes = UserRecentPlays.prefixes;

  commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: OWN_COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: START_POSITION, isOptional: true},
    {argument: QUANTITY, isOptional: true},
    {argument: MODS, isOptional: true},
  ];

  getRecentPlays: GetRecentPlaysUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    getRecentPlays: GetRecentPlaysUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super();
    this.getRecentPlays = getRecentPlays;
    this.getAppUserInfo = getAppUserInfo;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserRecentPlaysExecutionArgs> {
    const fail = CommandMatchResult.fail<UserRecentPlaysExecutionArgs>();
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
    const commandPrefix = argsProcessor.use(OWN_COMMAND_PREFIX).at(0).extract();
    const startPosition = argsProcessor.use(START_POSITION).extract();
    const quantity = argsProcessor.use(QUANTITY).extract();
    const mods = argsProcessor.use(MODS).extract();
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
      passesOnly: UserRecentPlays.recentPassesPrefixes.includes(commandPrefix),
      username: username,
      startPosition: startPosition,
      quantity: quantity,
      mods: mods,
    });
  }

  async process(
    args: UserRecentPlaysExecutionArgs
  ): Promise<UserRecentPlaysViewParams> {
    let username = args.username;
    if (username === undefined) {
      const appUserInfoResponse = await this.getAppUserInfo.execute({
        id: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
        server: args.server,
      });
      const boundUser = appUserInfoResponse.userInfo;
      if (boundUser === undefined) {
        return {
          server: args.server,
          passesOnly: args.passesOnly,
          usernameInput: undefined,
          recentPlays: undefined,
        };
      }
      username = boundUser.username;
    }
    const mods = args.mods || [];
    const startPosition = clamp(
      mods.length > 0 ? 1 : args.startPosition || 1,
      1,
      100
    );
    // eslint-disable-next-line prettier/prettier
    const quantity = clamp(
      mods.length > 0 ? 100 : args.quantity || 1,
      1,
      100
    );
    const recentPlaysResult = await this.getRecentPlays.execute({
      server: args.server,
      username: username,
      includeFails: !args.passesOnly,
      startPosition: startPosition,
      quantity: quantity,
      mods: mods,
    });
    if (recentPlaysResult.isFailure) {
      const internalFailureReason = recentPlaysResult.failureReason!;
      switch (internalFailureReason) {
        case 'user not found':
          return {
            server: args.server,
            passesOnly: args.passesOnly,
            usernameInput: args.username,
            recentPlays: undefined,
          };
        default:
          throw Error('Switch case is not exhaustive');
      }
    }
    return {
      server: args.server,
      passesOnly: args.passesOnly,
      usernameInput: args.username,
      recentPlays: recentPlaysResult.recentPlays!,
    };
  }

  createOutputMessage(params: UserRecentPlaysViewParams): VkOutputMessage {
    const {server, passesOnly, recentPlays} = params;
    if (recentPlays === undefined) {
      if (params.usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(params.server);
      }
      return this.createUserNotFoundMessage(
        params.server,
        params.usernameInput
      );
    }
    const {username} = recentPlays;
    if (recentPlays.plays.length === 0) {
      return this.createNoRecentPlaysMessage(server, passesOnly, username);
    }
    const scoresText = recentPlays.plays
      .map(p => `score: ${p.score}, acc: ${p.accuracy}, pp: ${p.pp}`)
      .join('\n');

    const serverString = OsuServer[params.server];
    const oneScore = recentPlays.plays.length === 1;
    const passesString = oneScore ? 'Последний пасс' : 'Последние пассы';
    const scoresString = oneScore ? 'Последний скор' : 'Последние скоры';
    const text = `
[Server: ${serverString}]
${passesOnly ? passesString : scoresString} ${username}
${scoresText}
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

  createUsernameNotBoundMessage(server: OsuServer): VkOutputMessage {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Не установлен ник!
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createNoRecentPlaysMessage(
    server: OsuServer,
    passesOnly: boolean,
    username: string
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const serverPrefix = SERVERS.getPrefixByServer(server);
    const recentPlaysPrefix = UserRecentPlays.recentPlaysPrefixes[0];
    const text = `
[Server: ${serverString}]
Нет последних ${passesOnly ? 'пассов' : 'скоров'}
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: passesOnly
        ? [
            [
              {
                text: `Последние скоры ${username}`,
                command: `${serverPrefix} ${recentPlaysPrefix} ${username}`,
              },
            ],
          ]
        : undefined,
    };
  }
}

interface UserRecentPlaysExecutionArgs {
  vkUserId: number;
  server: OsuServer;
  passesOnly: boolean;
  username: string | undefined;
  startPosition: number | undefined;
  quantity: number | undefined;
  mods: string[] | undefined;
}

interface UserRecentPlaysViewParams {
  server: OsuServer;
  passesOnly: boolean;
  usernameInput: string | undefined;
  recentPlays: OsuUserRecentPlays | undefined;
}
