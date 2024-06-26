import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {GetOsuUserInfoUseCase} from '../../../application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {Timespan} from '../../../../primitives/Timespan';
import {APP_CODE_NAME} from '../../../App';
import {SERVERS} from '../../common/OsuServers';
import {UserRecentPlays} from './UserRecentPlays';
import {GetAppUserInfoUseCase} from '../../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
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

export class UserInfo extends VkCommand<
  UserInfoExecutionArgs,
  UserInfoViewParams
> {
  internalName = UserInfo.name;
  shortDescription = 'статы игрока';
  longDescription = 'Отображает основную информацию об игроке';

  static prefixes = new CommandPrefixes('u', 'user');
  prefixes = UserInfo.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserInfo.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  getOsuUserInfo: GetOsuUserInfoUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    getRecentPlays: GetOsuUserInfoUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(UserInfo.commandStructure);
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
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
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
    if (server === undefined || ownPrefix === undefined) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: server,
      username: username,
      mode: mode,
      vkUserId: ctx.senderId,
    });
  }

  async process(args: UserInfoExecutionArgs): Promise<UserInfoViewParams> {
    let username = args.username;
    let mode = args.mode;
    if (username === undefined) {
      const appUserInfoResponse = await this.getAppUserInfo.execute({
        id: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
        server: args.server,
      });
      const boundUser = appUserInfoResponse.userInfo;
      if (boundUser === undefined) {
        return {
          server: args.server,
          mode: args.mode,
          usernameInput: undefined,
          userInfo: undefined,
        };
      }
      username = boundUser.username;
      mode ??= boundUser.ruleset;
    }
    const userInfoResponse = await this.getOsuUserInfo.execute({
      appUserId: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
      server: args.server,
      username: username,
      ruleset: mode,
    });
    const userInfo = userInfoResponse.userInfo;
    if (userInfo === undefined) {
      return {
        server: args.server,
        mode: args.mode,
        usernameInput: args.username,
        userInfo: undefined,
      };
    }
    let maybeRankGlobalHighest = userInfo.rankGlobalHighest;
    let rankHighestDateInLocalFormat: string | undefined = undefined;
    if (userInfo.rankGlobalHighestDate !== undefined) {
      const date = new Date(userInfo.rankGlobalHighestDate);
      const now = Date.now();
      const threeMonthsMillis = new Timespan().addDays(90).totalMiliseconds();
      if (
        now - date.getTime() < threeMonthsMillis ||
        userInfo.rankGlobal === maybeRankGlobalHighest
      ) {
        maybeRankGlobalHighest = undefined;
      } else {
        const day = date.getUTCDate();
        const dayFormatted = (day > 9 ? '' : '0') + day;
        const month = date.getUTCMonth() + 1;
        const monthFormatted = (month > 9 ? '' : '0') + month;
        const year = date.getUTCFullYear();
        rankHighestDateInLocalFormat = `${dayFormatted}.${monthFormatted}.${year}`;
      }
    }
    const playtime = new Timespan().addSeconds(userInfo.playtimeSeconds);
    return {
      server: args.server,
      mode: mode ?? userInfo.preferredMode,
      usernameInput: args.username,
      userInfo: {
        username: userInfo.username,
        rankGlobal: userInfo.rankGlobal,
        rankGlobalHighest: maybeRankGlobalHighest,
        rankGlobalHighestDate: rankHighestDateInLocalFormat,
        countryCode: userInfo.countryCode,
        rankCountry: userInfo.rankCountry,
        playcount: userInfo.playcount,
        lvl: userInfo.level,
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
    const {server, mode, usernameInput, userInfo} = params;
    if (userInfo === undefined) {
      if (usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(server);
      }
      return this.createUserNotFoundMessage(server, usernameInput);
    }
    return this.createUserInfoMessage(server, mode!, userInfo);
  }

  createUserInfoMessage(
    server: OsuServer,
    mode: OsuRuleset,
    userInfo: OsuUserInfo
  ) {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const {username} = userInfo;
    const rankGlobal = userInfo.rankGlobal || '—';
    const countryCode = userInfo.countryCode;
    const rankCountry = userInfo.rankCountry || '—';
    const {rankGlobalHighest, rankGlobalHighestDate} = userInfo;
    const {playcount, lvl} = userInfo;
    const {playtimeDays, playtimeHours, playtimeMinutes} = userInfo;
    const pp = userInfo.pp.toFixed(2);
    const accuracy = userInfo.accuracy.toFixed(2);
    const {userId} = userInfo;

    const maybePeakRankString =
      rankGlobalHighest === undefined
        ? ''
        : `\nPeak rank: #${rankGlobalHighest} (${rankGlobalHighestDate})`;

    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Player: ${username} (STD)
Rank: #${rankGlobal} (${countryCode} #${rankCountry})${maybePeakRankString}
Playcount: ${playcount} (Lv${lvl})
Playtime: ${playtimeDays}d ${playtimeHours}h ${playtimeMinutes}m
PP: ${pp}
Accuracy: ${accuracy}%

https://osu.ppy.sh/u/${userId}
    `.trim();

    const serverPrefix = SERVERS.getPrefixByServer(server);
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
            command: `${serverPrefix} ${bestPlaysPrefix} ${username} mode=${modeString}`,
          },
        ],
        [
          {
            text: `Последний скор ${username}`,
            command: `${serverPrefix} ${recentPlaysPrefix} ${username} mode=${modeString}`,
          },
        ],
        [
          {
            text: `Последний пасс ${username}`,
            command: `${serverPrefix} ${recentPassesPrefix} ${username} mode=${modeString}`,
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

type UserInfoExecutionArgs = {
  server: OsuServer;
  username: string | undefined;
  mode: OsuRuleset | undefined;
  vkUserId: number;
};

type UserInfoViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  usernameInput: string | undefined;
  userInfo: OsuUserInfo | undefined;
};

type OsuUserInfo = {
  username: string;
  rankGlobal: number | null;
  rankGlobalHighest: number | undefined;
  rankGlobalHighestDate: string | undefined;
  countryCode: string;
  rankCountry: number | null;
  playcount: number;
  lvl: number;
  playtimeDays: number;
  playtimeHours: number;
  playtimeMinutes: number;
  pp: number;
  accuracy: number;
  userId: number;
};
