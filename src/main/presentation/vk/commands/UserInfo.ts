import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage, VkOutputMessageButton} from './base/VkOutputMessage';
import {NOTICE_ABOUT_SPACES_IN_USERNAMES, VkCommand} from './base/VkCommand';
import {OsuServer} from '../../../primitives/OsuServer';
import {GetOsuUserInfoUseCase} from '../../../application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {Timespan} from '../../../primitives/Timespan';
import {APP_CODE_NAME} from '../../../App';
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
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {TextProcessor} from '../../common/arg_processing/TextProcessor';
import {UserBestPlays} from './UserBestPlays';

export class UserInfo extends VkCommand<
  UserInfoExecutionArgs,
  UserInfoViewParams
> {
  internalName = UserInfo.name;
  shortDescription = 'статы игрока';
  longDescription = 'Отображает основную информацию об игроке';
  notice = NOTICE_ABOUT_SPACES_IN_USERNAMES;

  static prefixes = new CommandPrefixes('u', 'User');
  prefixes = UserInfo.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserInfo.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  textProcessor: TextProcessor;
  getOsuUserInfo: GetOsuUserInfoUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    textProcessor: TextProcessor,
    getRecentPlays: GetOsuUserInfoUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(UserInfo.commandStructure);
    this.textProcessor = textProcessor;
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
      server: server,
      username: username,
      mode: mode,
      vkUserId: ctx.replyMessage?.senderId ?? ctx.senderId,
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

    const buttons: VkOutputMessageButton[] = [];
    const userBestPlaysCommand = this.otherCommands.find(
      x => x instanceof UserBestPlays
    );
    if (userBestPlaysCommand !== undefined) {
      buttons.push({
        text: `Топ скоры ${username}`,
        command: userBestPlaysCommand.unparse({
          server: server,
          username: username,
          mode: mode,
          vkUserId: -1,
          vkPeerId: -1,
          startPosition: undefined,
          quantity: undefined,
          mods: undefined,
        }),
      });
    }
    const userRecentPlaysCommand = this.otherCommands.find(
      x => x instanceof UserRecentPlays
    );
    if (userRecentPlaysCommand !== undefined) {
      buttons.push(
        {
          text: `Последний скор ${username}`,
          command: userRecentPlaysCommand.unparse({
            passesOnly: false,
            server: server,
            username: username,
            mode: mode,
            vkUserId: -1,
            vkPeerId: -1,
            startPosition: undefined,
            quantity: undefined,
            mods: undefined,
          }),
        },
        {
          text: `Последний пасс ${username}`,
          command: userRecentPlaysCommand.unparse({
            passesOnly: true,
            server: server,
            username: username,
            mode: mode,
            vkUserId: -1,
            vkPeerId: -1,
            startPosition: undefined,
            quantity: undefined,
            mods: undefined,
          }),
        }
      );
    }
    return {
      text: text,
      attachment: undefined,
      buttons: buttons.map(b => [b]),
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

  unparse(args: UserInfoExecutionArgs): string {
    const tokens = [
      SERVER_PREFIX.unparse(args.server),
      this.COMMAND_PREFIX.unparse(this.prefixes[0]),
    ];
    if (args.username !== undefined) {
      tokens.push(USERNAME.unparse(args.username));
    }
    if (args.mode !== undefined) {
      tokens.push(MODE.unparse(args.mode));
    }
    return this.textProcessor.detokenize(tokens);
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
