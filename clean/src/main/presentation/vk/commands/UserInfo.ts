import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from './base/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand, CommandPrefixes} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {GetOsuUserInfoUseCase} from '../../../domain/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {Timespan} from '../../../../primitives/Timespan';
import {APP_CODE_NAME} from '../../../App';
import {SERVERS} from './base/OsuServers';
import {UserRecentPlays} from './UserRecentPlays';
import {GetAppUserInfoUseCase} from '../../../domain/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {VkIdConverter} from '../VkIdConverter';
import {
  COMMAND_PREFIX,
  SERVER_PREFIX,
  USERNAME,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';

export class UserInfo extends VkCommand<
  UserInfoExecutionArgs,
  UserInfoViewParams
> {
  internalName = UserInfo.name;
  shortDescription = 'статы игрока';
  longDescription = 'Отображает основную информацию об игроке';

  static prefixes = new CommandPrefixes('u', 'user');
  prefixes = UserInfo.prefixes;

  commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
  ];

  getOsuUserInfo: GetOsuUserInfoUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    getRecentPlays: GetOsuUserInfoUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super();
    this.getOsuUserInfo = getRecentPlays;
    this.getAppUserInfo = getAppUserInfo;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserInfoExecutionArgs> {
    const fail = CommandMatchResult.fail<UserInfoExecutionArgs>();
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
    if (server === undefined || commandPrefix === undefined) {
      return fail;
    }
    if (!this.prefixes.matchIgnoringCase(commandPrefix)) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: server,
      username: username,
      vkUserId: ctx.senderId,
    });
  }

  async process(args: UserInfoExecutionArgs): Promise<UserInfoViewParams> {
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
          usernameInput: undefined,
          userInfo: undefined,
        };
      }
      username = boundUser.username;
    }
    const userInfoResponse = await this.getOsuUserInfo.execute({
      server: args.server,
      username: username,
    });
    const userInfo = userInfoResponse.userInfo;
    if (userInfo === undefined) {
      return {
        server: args.server,
        usernameInput: args.username,
        userInfo: undefined,
      };
    }
    const playtime = new Timespan().addSeconds(userInfo.playtimeSeconds);
    return {
      server: args.server,
      usernameInput: args.username,
      userInfo: {
        username: userInfo.username,
        rankGlobal: userInfo.rankGlobal,
        countryCode: userInfo.countryCode,
        rankCountry: userInfo.rankCountry,
        playcount: userInfo.playcount,
        lvl: userInfo.lvl,
        playtimeDays: playtime.days,
        playtimeHours: playtime.hours,
        playtimeMinutes: playtime.minutes,
        pp: userInfo.pp,
        accuracy: userInfo.accuracy,
        userId: userInfo.userId,
      },
    };
  }

  createOutputMessage(params: UserInfoViewParams): VkOutputMessage {
    const userInfo = params.userInfo;
    if (userInfo === undefined) {
      if (params.usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(params.server);
      }
      return this.createUserNotFoundMessage(
        params.server,
        params.usernameInput
      );
    }
    const serverString = OsuServer[params.server];
    const {username} = userInfo;
    const {rankGlobal, countryCode, rankCountry} = userInfo;
    const {playcount, lvl} = userInfo;
    const {playtimeDays, playtimeHours, playtimeMinutes} = userInfo;
    const pp = userInfo.pp.toFixed(2);
    const accuracy = userInfo.accuracy.toFixed(2);
    const {userId} = userInfo;

    const text = `
[Server: ${serverString}]
Player: ${username} (STD)
Rank: #${rankGlobal} (${countryCode} #${rankCountry})
Playcount: ${playcount} (Lv${lvl})
Playtime: ${playtimeDays}d ${playtimeHours}h ${playtimeMinutes}m
PP: ${pp}
Accuracy: ${accuracy}%

https://osu.ppy.sh/u/${userId}
    `.trim();

    const serverPrefix = SERVERS.getPrefixByServer(params.server);
    const bestPlaysPrefix = 't'; // TODO: use UserBestPlays.prefixes
    const recentPlaysPrefix = UserRecentPlays.recentPlaysPrefixes[0];
    const recentPassesPrefix = UserRecentPlays.recentPassesPrefixes[0];
    return {
      text: text,
      attachment: undefined,
      buttons: [
        [
          {
            text: `Топ скоры ${username}`,
            command: `${serverPrefix} ${bestPlaysPrefix} ${username}`,
          },
        ],
        [
          {
            text: `Последний скор ${username}`,
            command: `${serverPrefix} ${recentPlaysPrefix} ${username}`,
          },
        ],
        [
          {
            text: `Последний пасс ${username}`,
            command: `${serverPrefix} ${recentPassesPrefix} ${username}`,
          },
        ],
      ],
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
}

interface UserInfoExecutionArgs {
  server: OsuServer;
  username: string | undefined;
  vkUserId: number;
}

interface UserInfoViewParams {
  server: OsuServer;
  usernameInput: string | undefined;
  userInfo: OsuUserInfo | undefined;
}

interface OsuUserInfo {
  username: string;
  rankGlobal: number;
  countryCode: string;
  rankCountry: number;
  playcount: number;
  lvl: number;
  playtimeDays: number;
  playtimeHours: number;
  playtimeMinutes: number;
  pp: number;
  accuracy: number;
  userId: number;
}
