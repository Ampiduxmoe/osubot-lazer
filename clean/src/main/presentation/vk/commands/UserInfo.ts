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

export class UserInfo extends VkCommand<
  UserInfoExecutionParams,
  UserInfoViewParams
> {
  static prefixes = new CommandPrefixes(['u', 'user']);
  prefixes = UserInfo.prefixes;

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
  ): CommandMatchResult<UserInfoExecutionParams> {
    const fail = CommandMatchResult.fail<UserInfoExecutionParams>();
    let command: string | undefined = undefined;
    if (ctx.hasMessagePayload && ctx.messagePayload!.target === APP_CODE_NAME) {
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
    return CommandMatchResult.ok({
      server: server,
      usernameInput: username,
      vkUserId: ctx.senderId,
    });
  }

  async process(params: UserInfoExecutionParams): Promise<UserInfoViewParams> {
    let username = params.usernameInput;
    if (username === undefined) {
      const appUserInfoResponse = await this.getAppUserInfo.execute({
        id: VkIdConverter.vkUserIdToAppUserId(params.vkUserId),
        server: params.server,
      });
      const boundUser = appUserInfoResponse.userInfo;
      if (boundUser === undefined) {
        return {
          server: params.server,
          usernameInput: undefined,
          userInfo: undefined,
        };
      }
      username = boundUser.username;
    }
    const userInfoResponse = await this.getOsuUserInfo.execute({
      server: params.server,
      username: username,
    });
    const userInfo = userInfoResponse.userInfo;
    if (userInfo === undefined) {
      return {
        server: params.server,
        usernameInput: params.usernameInput,
        userInfo: undefined,
      };
    }
    const playtime = new Timespan().addSeconds(userInfo.playtimeSeconds);
    return {
      server: params.server,
      usernameInput: params.usernameInput,
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

interface UserInfoExecutionParams {
  server: OsuServer;
  usernameInput: string | undefined;
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
