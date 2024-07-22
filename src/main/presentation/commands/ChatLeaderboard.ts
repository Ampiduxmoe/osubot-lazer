import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuUserInfo} from '../../application/usecases/get_osu_user_info/GetOsuUserInfoResponse';
import {GetOsuUserInfoUseCase} from '../../application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {maxBy} from '../../primitives/Arrays';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {
  MODE,
  OWN_COMMAND_PREFIX,
  SERVER_PREFIX,
  USERNAME_LIST,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {
  NOTICE_ABOUT_SPACES_IN_USERNAMES,
  TextCommand,
} from './base/TextCommand';

export abstract class ChatLeaderboard<TContext, TOutput> extends TextCommand<
  ChatLeaderboardExecutionArgs,
  ChatLeaderboardViewParams,
  TContext,
  TOutput
> {
  internalName = ChatLeaderboard.name;
  shortDescription = 'топ чата';
  longDescription = 'Показывает топ игроков (по умолчанию игроки беседы)';
  notice = NOTICE_ABOUT_SPACES_IN_USERNAMES;

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

  textProcessor: TextProcessor;
  getInitiatorAppUserId: (ctx: TContext) => string;
  getLocalAppUserIds: (ctx: TContext) => Promise<string[]>;
  getOsuUserInfo: GetOsuUserInfoUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    textProcessor: TextProcessor,
    getInitiatorAppUserId: (ctx: TContext) => string,
    getLocalAppUserIds: (ctx: TContext) => Promise<string[]>,
    getOsuUserInfo: GetOsuUserInfoUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(ChatLeaderboard.commandStructure);
    this.textProcessor = textProcessor;
    this.getInitiatorAppUserId = getInitiatorAppUserId;
    this.getLocalAppUserIds = getLocalAppUserIds;
    this.getOsuUserInfo = getOsuUserInfo;
    this.getAppUserInfo = getAppUserInfo;
  }

  matchText(text: string): CommandMatchResult<ChatLeaderboardExecutionArgs> {
    const fail = CommandMatchResult.fail<ChatLeaderboardExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    if (server === undefined || ownPrefix === undefined) {
      return fail;
    }
    const usernameList = argsProcessor.use(USERNAME_LIST).extract();
    const mode = argsProcessor.use(MODE).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: server,
      usernameList: usernameList,
      mode: mode,
    });
  }

  async process(
    args: ChatLeaderboardExecutionArgs,
    ctx: TContext
  ): Promise<ChatLeaderboardViewParams> {
    const initiatorAppUserId = this.getInitiatorAppUserId(ctx);
    let preferredModes: {
      username: string;
      mode: OsuRuleset | undefined;
    }[] = await (async () => {
      if (args.usernameList === undefined || args.usernameList.isAdditive) {
        const localMembers = await this.getLocalAppUserIds(ctx);
        const appUserInfoResponses = await Promise.all(
          localMembers.map(appUserid =>
            this.getAppUserInfo.execute({
              id: appUserid,
              server: args.server,
            })
          )
        );
        const localEntries = appUserInfoResponses
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
        return [...localEntries, ...selectedEntries];
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
            appUserId: initiatorAppUserId,
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
            appUserId: initiatorAppUserId,
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
        isOnlyLocalMembersLb: isChatLb,
      };
    }
    return {
      server: args.server,
      mode: mode,
      users: allUsersSorted,
      missingUsernames: missingUsernames,
      isOnlyLocalMembersLb: isChatLb,
    };
  }

  createOutputMessage(params: ChatLeaderboardViewParams): Promise<TOutput> {
    const {server, mode, users, missingUsernames, isOnlyLocalMembersLb} =
      params;
    if (users === undefined) {
      return this.createNoUsersMessage(server, missingUsernames ?? []);
    }
    return this.createLeaderboardMessage(
      server,
      users,
      mode!,
      missingUsernames!,
      isOnlyLocalMembersLb
    );
  }

  abstract createLeaderboardMessage(
    server: OsuServer,
    users: OsuUserInfo[],
    mode: OsuRuleset,
    missingUsernames: string[],
    isOnlyLocalMembersLb: boolean
  ): Promise<TOutput>;

  abstract createNoUsersMessage(
    server: OsuServer,
    missingUsernames: string[]
  ): Promise<TOutput>;

  unparse(args: ChatLeaderboardExecutionArgs): string {
    const tokens = [
      SERVER_PREFIX.unparse(args.server),
      this.COMMAND_PREFIX.unparse(this.prefixes[0]),
    ];
    if (args.usernameList !== undefined) {
      tokens.push(USERNAME_LIST.unparse(args.usernameList));
    }
    if (args.mode !== undefined) {
      tokens.push(MODE.unparse(args.mode));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type ChatLeaderboardExecutionArgs = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  usernameList: {usernames: string[]; isAdditive: boolean} | undefined;
};

export type ChatLeaderboardViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  users: OsuUserInfo[] | undefined;
  missingUsernames: string[] | undefined;
  isOnlyLocalMembersLb: boolean;
};
