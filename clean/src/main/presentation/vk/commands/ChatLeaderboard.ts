/* eslint-disable no-irregular-whitespace */
import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {GetAppUserInfoUseCase} from '../../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {VkIdConverter} from '../VkIdConverter';
import {
  OWN_COMMAND_PREFIX,
  SERVER_PREFIX,
  USERNAME_LIST,
  MODE,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {CommandPrefixes} from '../../common/CommandPrefixes';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../../../primitives/OsuRuleset';
import {GetOsuUserInfoUseCase} from '../../../application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {OsuUserInfo} from '../../../application/usecases/get_osu_user_info/GetOsuUserInfoResponse';
import {maxBy} from '../../../../primitives/Arrays';

export class ChatLeaderboard extends VkCommand<
  ChatLeaderboardExecutionArgs,
  ChatLeaderboardViewParams
> {
  internalName = ChatLeaderboard.name;
  shortDescription = 'топ чата';
  longDescription = 'Показывает топ игроков (по умолчанию игроки беседы)';

  static prefixes = new CommandPrefixes('l', 'lb', 'Leaderboard');
  prefixes = ChatLeaderboard.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = ChatLeaderboard.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME_LIST, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  tokenize: (text: string) => string[];
  getChatMemberIds: (chatId: number) => Promise<number[]>;
  getOsuUserInfo: GetOsuUserInfoUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    tokenize: (text: string) => string[],
    getChatMemberIds: (chatId: number) => Promise<number[]>,
    getOsuUserInfo: GetOsuUserInfoUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(ChatLeaderboard.commandStructure);
    this.tokenize = tokenize;
    this.getChatMemberIds = getChatMemberIds;
    this.getOsuUserInfo = getOsuUserInfo;
    this.getAppUserInfo = getAppUserInfo;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<ChatLeaderboardExecutionArgs> {
    const fail = CommandMatchResult.fail<ChatLeaderboardExecutionArgs>();
    let command: string | undefined = undefined;
    if (ctx.hasMessagePayload && ctx.messagePayload!.target === APP_CODE_NAME) {
      command = ctx.messagePayload!.command;
    } else if (ctx.hasText) {
      command = ctx.text!;
    }
    if (command === undefined) {
      return fail;
    }

    const tokens = this.tokenize(command);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    const usernameList = argsProcessor.use(USERNAME_LIST).extract();
    const mode = argsProcessor.use(MODE).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (server === undefined || ownPrefix === undefined) {
      return fail;
    }
    return CommandMatchResult.ok({
      vkUserId: ctx.senderId,
      vkChatId: ctx.chatId,
      server: server,
      usernameList: usernameList,
      mode: mode,
    });
  }

  async process(
    args: ChatLeaderboardExecutionArgs
  ): Promise<ChatLeaderboardViewParams> {
    let preferredModes: {
      username: string;
      mode: OsuRuleset | undefined;
    }[] = await (async () => {
      if (args.usernameList === undefined || args.usernameList.isAdditive) {
        const conversationMembers =
          args.vkChatId === undefined
            ? [args.vkUserId]
            : await this.getChatMemberIds(args.vkChatId);
        const appUserInfoResponses = await Promise.all(
          conversationMembers.map(id =>
            this.getAppUserInfo.execute({
              id: VkIdConverter.vkUserIdToAppUserId(id),
              server: args.server,
            })
          )
        );
        const chatEntries = appUserInfoResponses
          .filter(x => x.userInfo !== undefined)
          .map(x => ({
            username: x.userInfo!.username,
            mode: x.userInfo!.ruleset,
          }));
        const selectedEntries =
          args.usernameList?.usernames?.map(x => ({
            username: x,
            mode: undefined,
          })) ?? [];
        return [...chatEntries, ...selectedEntries];
      }
      return args.usernameList.usernames.map(x => ({
        username: x,
        mode: undefined,
      }));
    })();
    const missingUsernames: string[] = [];
    const selectedOsuUsers: (OsuUserInfo | undefined)[] = await Promise.all(
      preferredModes
        .filter(x => x.mode === undefined)
        .map(async x => {
          const osuUserInfoResponse = await this.getOsuUserInfo.execute({
            appUserId: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
            server: args.server,
            username: x.username,
            ruleset: args.mode,
          });
          const osuUserInfo = osuUserInfoResponse.userInfo;
          if (osuUserInfo === undefined) {
            missingUsernames.push(x.username);
            return osuUserInfo;
          }
          x.mode = osuUserInfo.preferredMode;
          return osuUserInfo;
        })
    );
    preferredModes = preferredModes.filter(
      x => !missingUsernames.includes(x.username)
    );
    const mode: OsuRuleset = (() => {
      if (args.mode !== undefined) {
        return args.mode;
      }
      const allUserModes = preferredModes
        .filter(x => x.mode !== undefined)
        .map(x => x.mode!);
      const prevalentMode = maxBy(
        ruleset => allUserModes.filter(m => m === ruleset).length,
        ALL_OSU_RULESETS.map(k => OsuRuleset[k])
      );
      return prevalentMode;
    })();
    const selectedOsuUsersFiltered = selectedOsuUsers.filter(
      x => x !== undefined
    ) as OsuUserInfo[];
    const alreadyCheckedUsernames = [
      ...selectedOsuUsersFiltered.map(x => x.username.toLowerCase()),
      ...missingUsernames.map(x => x.toLowerCase()),
    ];
    const remainingUsers: (OsuUserInfo | undefined)[] = await Promise.all(
      preferredModes
        .filter(
          x => !alreadyCheckedUsernames.includes(x.username.toLowerCase())
        )
        .map(async x => {
          const osuUserInfoResponse = await this.getOsuUserInfo.execute({
            appUserId: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
            server: args.server,
            username: x.username,
            ruleset: mode,
          });
          const osuUserInfo = osuUserInfoResponse.userInfo;
          if (osuUserInfo === undefined) {
            missingUsernames.push(x.username);
          }
          return osuUserInfo;
        })
    );
    const remainingUsersFiltered = remainingUsers.filter(
      x => x !== undefined
    ) as OsuUserInfo[];
    const allUsersSorted = [
      ...selectedOsuUsersFiltered,
      ...remainingUsersFiltered,
    ].sort((a, b) => {
      const aPp = a.pp || 0;
      const bPp = b.pp || 0;
      if (aPp !== bPp) {
        return bPp - aPp;
      }
      const aRank = a.rankGlobal ?? Number.MAX_VALUE;
      const bRank = b.rankGlobal ?? Number.MAX_VALUE;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      return a.username > b.username ? 1 : -1;
    });
    const isChatLb =
      args.usernameList === undefined || args.usernameList.isAdditive;
    if (allUsersSorted.length === 0) {
      return {
        server: args.server,
        mode: mode,
        users: undefined,
        missingUsernames: missingUsernames,
        isChatLb: isChatLb,
      };
    }
    return {
      server: args.server,
      mode: mode,
      users: allUsersSorted,
      missingUsernames: missingUsernames,
      isChatLb: isChatLb,
    };
  }

  createOutputMessage(params: ChatLeaderboardViewParams): VkOutputMessage {
    const {server, mode, users, missingUsernames, isChatLb} = params;
    if (users === undefined) {
      return this.createNoUsersMessage(server, missingUsernames ?? []);
    }
    return this.createLeaderboardMessage(
      server,
      users,
      mode!,
      missingUsernames!,
      isChatLb
    );
  }

  createLeaderboardMessage(
    server: OsuServer,
    users: OsuUserInfo[],
    mode: OsuRuleset,
    missingUsernames: string[],
    isChatLb: boolean
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const usersText = users
      .map((u, i) => this.shortUserDescription(i + 1, u))
      .join('\n');
    const missingUsernamesMessage =
      missingUsernames.length > 0
        ? '\nНе удалось найти игроков с никами:\n' + missingUsernames.join(', ')
        : '';
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Топ ${isChatLb ? 'игроков чата' : 'выбранных игроков'}

${usersText}

${missingUsernamesMessage}
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  shortUserDescription(pos: number, user: OsuUserInfo): string {
    const rankGlobal = user.rankGlobal || '—';
    const acc = user.accuracy.toFixed(2);
    const pp = isNaN(user.pp) ? '—' : user.pp.toFixed(0);
    return `
${pos}. ${user.username}
　 ${acc}%　${pp}pp　#${rankGlobal}
    `.trim();
  }

  createNoUsersMessage(
    server: OsuServer,
    missingUsernames: string[]
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const missingUsernamesMessage =
      missingUsernames.length > 0
        ? '\nНе удалось найти игроков с никами:\n' + missingUsernames.join(', ')
        : '';
    const text = `
[Server: ${serverString}]
Невозможно выполнить команду для пустого списка игроков!
Привяжите ник к аккаунту или явно укажите список ников для отображения.

${missingUsernamesMessage}
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }
}

type ChatLeaderboardExecutionArgs = {
  vkUserId: number;
  vkChatId: number | undefined;
  server: OsuServer;
  mode: OsuRuleset | undefined;
  usernameList: {usernames: string[]; isAdditive: boolean} | undefined;
};

type ChatLeaderboardViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  users: OsuUserInfo[] | undefined;
  missingUsernames: string[] | undefined;
  isChatLb: boolean;
};
