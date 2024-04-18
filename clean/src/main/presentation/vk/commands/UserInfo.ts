import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from './base/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand, CommandPrefixes} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {GetUserInfoUseCase} from '../../../domain/usecases/get_user_info/GetUserInfoUseCase';
import {Timespan} from '../../../../primitives/Timespan';
import {APP_CODE_NAME} from '../../../App';
import {SERVERS} from './base/OsuServers';
import {UserRecentPlays} from './UserRecentPlays';

export class UserInfo extends VkCommand<
  UserInfoExecutionParams,
  UserInfoViewParams
> {
  static prefixes = new CommandPrefixes(['u', 'user']);
  prefixes = UserInfo.prefixes;
  getUserInfo: GetUserInfoUseCase;

  constructor(getRecentPlays: GetUserInfoUseCase) {
    super();
    this.getUserInfo = getRecentPlays;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserInfoExecutionParams> {
    const fail = CommandMatchResult.fail<UserInfoExecutionParams>();
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
      server: server,
      username: username,
    });
  }

  async process(params: UserInfoExecutionParams): Promise<UserInfoViewParams> {
    const userInfo = await this.getUserInfo.execute({
      server: params.server,
      username: params.username,
    });
    const playtime = new Timespan().addSeconds(userInfo.playtimeSeconds);
    return {
      server: params.server,
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
    };
  }

  createOutputMessage(params: UserInfoViewParams): VkOutputMessage {
    const serverString = OsuServer[params.server];
    const {username} = params;
    const {rankGlobal, countryCode, rankCountry} = params;
    const {playcount, lvl} = params;
    const {playtimeDays, playtimeHours, playtimeMinutes} = params;
    const pp = params.pp.toFixed(2);
    const accuracy = params.accuracy.toFixed(2);
    const {userId} = params;

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
    const recentPlaysPrefix = UserRecentPlays.prefixes;
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
      ],
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
