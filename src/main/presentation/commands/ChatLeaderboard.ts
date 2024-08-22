import {AppUserInfo} from '../../application/usecases/get_app_user_info/GetAppUserInfoResponse';
import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuUserInfo} from '../../application/usecases/get_osu_user_info/GetOsuUserInfoResponse';
import {GetOsuUserInfoUseCase} from '../../application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {maxBy, uniquesFilter} from '../../primitives/Arrays';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {CommandArgument} from '../common/arg_processing/CommandArgument';
import {
  MODE,
  OWN_COMMAND_PREFIX,
  SERVER_PREFIX,
  USERNAME_LIST,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {
  CommandMatchResult,
  TokenMatchEntry,
} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {
  NOTICE_ABOUT_SPACES_IN_USERNAMES,
  TextCommand,
} from './base/TextCommand';
import {GetInitiatorAppUserId, GetLocalAppUserIds} from './common/Signatures';

export abstract class ChatLeaderboard<TContext, TOutput> extends TextCommand<
  ChatLeaderboardExecutionArgs,
  ChatLeaderboardViewParams,
  TContext,
  TOutput
> {
  internalName = ChatLeaderboard.name;
  shortDescription = 'топ чата';
  longDescription = 'Показывает топ игроков (по умолчанию игроки беседы)';
  notices = [NOTICE_ABOUT_SPACES_IN_USERNAMES];

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

  constructor(
    public textProcessor: TextProcessor,
    protected getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    protected getLocalAppUserIds: GetLocalAppUserIds<TContext>,
    protected getOsuUserInfo: GetOsuUserInfoUseCase,
    protected getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(ChatLeaderboard.commandStructure);
  }

  matchText(text: string): CommandMatchResult<ChatLeaderboardExecutionArgs> {
    const fail = CommandMatchResult.fail<ChatLeaderboardExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const serverRes = argsProcessor.use(SERVER_PREFIX).at(0).extractWithToken();
    const ownPrefixRes = argsProcessor
      .use(this.COMMAND_PREFIX)
      .at(0)
      .extractWithToken();
    if (serverRes[0] === undefined || ownPrefixRes[0] === undefined) {
      return fail;
    }
    const usernameListRes = argsProcessor.use(USERNAME_LIST).extractWithToken();
    const modeRes = argsProcessor.use(MODE).extractWithToken();

    if (argsProcessor.remainingTokens.length > 0) {
      let extractionResults = [
        [...serverRes, SERVER_PREFIX],
        [...ownPrefixRes, this.COMMAND_PREFIX],
        [...usernameListRes, USERNAME_LIST],
        [...modeRes, MODE],
      ];
      const mapping: TokenMatchEntry[] = [];
      for (const originalToken of tokens) {
        const extractionResult = extractionResults.find(
          r => r[1] === originalToken
        );
        if (extractionResult !== undefined) {
          extractionResults = extractionResults.filter(
            r => r !== extractionResult
          );
        }
        mapping.push({
          token: originalToken,
          argument: extractionResult?.at(2) as
            | CommandArgument<unknown>
            | undefined,
        });
      }
      return CommandMatchResult.partial(mapping);
    }
    const server = serverRes[0];
    const usernameList = usernameListRes[0];
    const mode = modeRes[0];
    return CommandMatchResult.ok({
      server: server,
      usernameList: usernameList,
      mode: mode,
    });
  }

  process(
    args: ChatLeaderboardExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<ChatLeaderboardViewParams> {
    const valuePromise: Promise<ChatLeaderboardViewParams> = (async () => {
      const includeLocalUsers =
        args.usernameList === undefined || args.usernameList.isAdditive;
      const initiatorAppUserId = this.getInitiatorAppUserId(ctx);

      /**
       * Method for getting AppUserInfo
       * for local app users (usually chat/conversation),
       * optimized to minimize external calls count
       */
      const localAppUsers: () => Promise<AppUserInfo[]> = (() => {
        let appUsersPromise: Promise<AppUserInfo[]> | undefined = undefined;
        return async () => {
          // Avoid fetching chat users multiple times
          appUsersPromise ??= (async () => {
            const appUserIds = await this.getLocalAppUserIds(ctx);
            const appUserResults = await Promise.all(
              appUserIds.map(id =>
                this.getAppUserInfo.execute({id: id, server: args.server})
              )
            );
            const appUsers = appUserResults
              .map(r => r.userInfo)
              .filter(info => info !== undefined);
            return appUsers;
          })();
          return appUsersPromise;
        };
      })();

      /**
       * Method for getting OsuUserInfo,
       * optimized to minimize external calls count
       */
      const osuUserInfo: (
        username: string,
        mode: OsuRuleset | undefined
      ) => Promise<OsuUserInfo | undefined> = (() => {
        const userInfoPromises: Record<
          string,
          Promise<OsuUserInfo | undefined>
        > = {};
        return async (username, mode) => {
          const usernameArgNormalized = username.toLowerCase();
          const cacheKeyByArgs = usernameArgNormalized + mode;
          // Avoid fetching osu users multiple times
          userInfoPromises[cacheKeyByArgs] ??= (async () => {
            const info = (
              await this.getOsuUserInfo.execute({
                initiatorAppUserId: initiatorAppUserId,
                server: args.server,
                username: username,
                ruleset: mode,
              })
            ).userInfo;
            if (info === undefined) {
              return undefined;
            }
            const usernameNormalized = info.username.toLowerCase();
            if (mode === undefined) {
              // Request for a user info without specified mode
              // is identicall to request with their preferred mode,
              // so we save this result under additional key
              userInfoPromises[usernameNormalized + info.preferredMode] ??=
                Promise.resolve(info);
            }
            if (info.preferredMode === mode) {
              // Request for a user info with their preferred mode
              // is identicall to request without mode at all,
              // so we save this result under additional key
              userInfoPromises[usernameNormalized + undefined] ??=
                Promise.resolve(info);
            }
            return info;
          })();
          return userInfoPromises[cacheKeyByArgs];
        };
      })();

      const targetMode: OsuRuleset = await (async () => {
        if (args.mode !== undefined) {
          return args.mode;
        }
        const modesPopularity = ALL_OSU_RULESETS.reduce(
          (dict, key) => ({...dict, [OsuRuleset[key]]: 0}),
          {} as Record<OsuRuleset, number>
        );
        if (includeLocalUsers) {
          for (const appUser of await localAppUsers()) {
            modesPopularity[appUser.ruleset] += 1;
          }
        }
        if (args.usernameList !== undefined) {
          const selectedOsuUsers = await Promise.all(
            args.usernameList.usernames.map(username =>
              osuUserInfo(username, undefined)
            )
          );
          for (const osuUser of selectedOsuUsers) {
            if (osuUser !== undefined) {
              modesPopularity[osuUser.preferredMode] += 1;
            }
          }
        }
        const mostPopularMode = maxBy(
          ruleset => modesPopularity[ruleset],
          ALL_OSU_RULESETS.map(key => OsuRuleset[key])
        );
        return mostPopularMode;
      })();

      const allTargetUsernamesNormalized: string[] = await (async () => {
        const usernames: string[] = [];
        if (includeLocalUsers) {
          usernames.push(...(await localAppUsers()).map(u => u.username));
        }
        if (args.usernameList !== undefined) {
          usernames.push(...args.usernameList.usernames);
        }
        return usernames
          .map(username => username.toLowerCase())
          .filter(uniquesFilter);
      })();

      const allTargetUsers: OsuUserInfo[] = await (async () => {
        const allUserInfos = await Promise.all(
          allTargetUsernamesNormalized.map(username =>
            osuUserInfo(username, targetMode)
          )
        );
        return allUserInfos.filter(info => info !== undefined);
      })();
      allTargetUsers.sort((a, b) => {
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

      const missingUsernames: string[] = (() => {
        const allFetchedUsernames = allTargetUsers.map(u =>
          u.username.toLowerCase()
        );
        return allTargetUsernamesNormalized.filter(
          username => !allFetchedUsernames.includes(username)
        );
      })();

      const isChatLb = args.usernameList === undefined;

      if (allTargetUsers.length === 0) {
        return {
          server: args.server,
          mode: targetMode,
          users: undefined,
          missingUsernames: missingUsernames,
          isOnlyLocalMembersLb: isChatLb,
        };
      }
      return {
        server: args.server,
        mode: targetMode,
        users: allTargetUsers,
        missingUsernames: missingUsernames,
        isOnlyLocalMembersLb: isChatLb,
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(
    params: ChatLeaderboardViewParams
  ): MaybeDeferred<TOutput> {
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
  ): MaybeDeferred<TOutput>;

  abstract createNoUsersMessage(
    server: OsuServer,
    missingUsernames: string[]
  ): MaybeDeferred<TOutput>;

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
