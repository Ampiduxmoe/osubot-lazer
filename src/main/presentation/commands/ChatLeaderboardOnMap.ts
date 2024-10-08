import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {
  OsuMap,
  OsuMapUserBestPlays,
} from '../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';
import {GetBeatmapUsersBestScoresUseCase} from '../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {uniquesFilter} from '../../primitives/Arrays';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {ModPatternCollection} from '../../primitives/ModPatternCollection';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {CommandArgument} from '../common/arg_processing/CommandArgument';
import {
  BEATMAP_ID,
  MOD_PATTERNS,
  ModPatternsArg,
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
import {
  GetContextualBeatmapIds,
  GetInitiatorAppUserId,
  GetLastSeenBeatmapId,
  GetLocalAppUserIds,
  SaveLastSeenBeatmapId,
} from './common/Signatures';

export abstract class ChatLeaderboardOnMap<
  TContext,
  TOutput,
> extends TextCommand<
  ChatLeaderboardOnMapExecutionArgs,
  ChatLeaderboardOnMapViewParams,
  TContext,
  TOutput
> {
  internalName = ChatLeaderboardOnMap.name;
  shortDescription = 'топ чата на карте';
  longDescription =
    'На выбранной карте показывает топ, ' +
    'составленный из скоров игроков ' +
    '(по умолчанию игроки беседы)';
  notices = [NOTICE_ABOUT_SPACES_IN_USERNAMES];

  static prefixes = new CommandPrefixes('ml', 'mlb', 'MapLeaderboard');
  prefixes = ChatLeaderboardOnMap.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = ChatLeaderboardOnMap.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: BEATMAP_ID, isOptional: true},
    {argument: USERNAME_LIST, isOptional: true},
    {argument: MOD_PATTERNS, isOptional: true},
  ];

  constructor(
    public textProcessor: TextProcessor,
    protected getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    protected getLocalAppUserIds: GetLocalAppUserIds<TContext>,
    protected getContextualBeatmapIds: GetContextualBeatmapIds<TContext>,
    protected getLastSeenBeatmapId: GetLastSeenBeatmapId<TContext>,
    protected saveLastSeenBeatmapId: SaveLastSeenBeatmapId<TContext>,
    protected getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase,
    protected getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(ChatLeaderboardOnMap.commandStructure);
  }

  matchText(
    text: string
  ): CommandMatchResult<ChatLeaderboardOnMapExecutionArgs> {
    const fail = CommandMatchResult.fail<ChatLeaderboardOnMapExecutionArgs>();
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
    const beatmapIdRes = argsProcessor.use(BEATMAP_ID).extractWithToken();
    const usernameListRes = argsProcessor.use(USERNAME_LIST).extractWithToken();
    const modPatternsRes = argsProcessor.use(MOD_PATTERNS).extractWithToken();

    if (argsProcessor.remainingTokens.length > 0) {
      let extractionResults = [
        [...serverRes, SERVER_PREFIX],
        [...ownPrefixRes, this.COMMAND_PREFIX],
        [...beatmapIdRes, BEATMAP_ID],
        [...usernameListRes, USERNAME_LIST],
        [...modPatternsRes, MOD_PATTERNS],
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
    const beatmapId = beatmapIdRes[0];
    const usernameList = usernameListRes[0];
    const modPatterns = modPatternsRes[0];
    return CommandMatchResult.ok({
      server: server,
      beatmapId: beatmapId,
      usernameList: usernameList,
      modPatterns: modPatterns,
    });
  }

  process(
    args: ChatLeaderboardOnMapExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<ChatLeaderboardOnMapViewParams> {
    const valuePromise: Promise<ChatLeaderboardOnMapViewParams> = (async () => {
      const allTargetUsernamesNormalized: string[] = await (async () => {
        const usernames: string[] = [];
        const includeLocalUsers =
          args.usernameList === undefined || args.usernameList.isAdditive;
        if (includeLocalUsers) {
          const appUserIds = await this.getLocalAppUserIds(ctx);
          const appUserInfoResults = await Promise.all(
            appUserIds.map(id =>
              this.getAppUserInfo.execute({
                id: id,
                server: args.server,
              })
            )
          );
          const localUsernames = appUserInfoResults
            .map(x => x.userInfo?.username)
            .filter(username => username !== undefined);
          usernames.push(...localUsernames);
        }
        if (args.usernameList !== undefined) {
          usernames.push(...args.usernameList.usernames);
        }
        return usernames
          .map(username => username.toLowerCase())
          .filter(uniquesFilter);
      })();
      const isChatLb = args.usernameList === undefined;
      if (allTargetUsernamesNormalized.length === 0) {
        return {
          server: args.server,
          usernames: [],
          beatmapIdInput: args.beatmapId,
          mode: undefined,
          map: undefined,
          plays: undefined,
          missingUsernames: undefined,
          isOnlyLocalMembersLb: isChatLb,
        };
      }
      const targetBeatmapId: number | undefined = await (async () => {
        if (args.beatmapId !== undefined) {
          return args.beatmapId;
        }
        const closestIds = this.getContextualBeatmapIds(ctx);
        if (closestIds.length === 1) {
          return closestIds[0].id;
        }
        return await this.getLastSeenBeatmapId(ctx, args.server);
      })();
      if (targetBeatmapId === undefined) {
        return {
          server: args.server,
          usernames: allTargetUsernamesNormalized,
          beatmapIdInput: undefined,
          mode: undefined,
          map: undefined,
          plays: undefined,
          missingUsernames: undefined,
          isOnlyLocalMembersLb: isChatLb,
        };
      }
      const modPatterns: ModPatternCollection = (() => {
        if (args.modPatterns === undefined) {
          return new ModPatternCollection();
        }
        if (args.modPatterns.strictMatch) {
          return args.modPatterns.collection;
        }
        return args.modPatterns.collection
          .allowLegacy()
          .treatAsInterchangeable('DT', 'NC')
          .treatAsInterchangeable('HT', 'DC');
      })();
      const leaderboardResponse = await this.getBeatmapBestScores.execute({
        initiatorAppUserId: this.getInitiatorAppUserId(ctx),
        server: args.server,
        beatmapId: targetBeatmapId,
        usernames: allTargetUsernamesNormalized,
        startPosition: 1,
        quantityPerUser: 1,
        modPatterns: modPatterns,
      });
      if (leaderboardResponse.failureReason !== undefined) {
        switch (leaderboardResponse.failureReason) {
          case 'beatmap not found':
            return {
              server: args.server,
              usernames: allTargetUsernamesNormalized,
              beatmapIdInput: args.beatmapId,
              mode: undefined,
              map: undefined,
              plays: undefined,
              missingUsernames: undefined,
              isOnlyLocalMembersLb: isChatLb,
            };
        }
      }
      if (targetBeatmapId !== undefined) {
        await this.saveLastSeenBeatmapId(ctx, args.server, targetBeatmapId);
      }
      return {
        server: args.server,
        usernames: allTargetUsernamesNormalized,
        beatmapIdInput: args.beatmapId,
        mode: leaderboardResponse.ruleset!,
        map: leaderboardResponse.baseBeatmap!,
        plays: leaderboardResponse.mapPlays!,
        missingUsernames: leaderboardResponse.missingUsernames!,
        isOnlyLocalMembersLb: isChatLb,
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(
    params: ChatLeaderboardOnMapViewParams
  ): MaybeDeferred<TOutput> {
    const {
      server,
      usernames,
      beatmapIdInput,
      mode,
      map,
      plays,
      missingUsernames,
      isOnlyLocalMembersLb,
    } = params;
    if (usernames.length === 0) {
      return this.createNoUsernamesMessage(server);
    }
    if (map === undefined || plays === undefined) {
      if (beatmapIdInput === undefined) {
        return this.createBeatmapIdNotSpecifiedMessage(server);
      }
      return this.createMapNotFoundMessage(server, beatmapIdInput);
    }
    if (plays.length === 0) {
      return this.createNoMapPlaysMessage(server, mode!, missingUsernames!);
    }
    return this.createMapPlaysMessage(
      map,
      plays,
      server,
      mode!,
      missingUsernames!,
      isOnlyLocalMembersLb
    );
  }

  abstract createMapPlaysMessage(
    map: OsuMap,
    mapPlays: OsuMapUserBestPlays[],
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[],
    isOnlyLocalMembersLb: boolean
  ): MaybeDeferred<TOutput>;
  abstract createMapNotFoundMessage(
    server: OsuServer,
    mapId: number
  ): MaybeDeferred<TOutput>;
  abstract createNoUsernamesMessage(server: OsuServer): MaybeDeferred<TOutput>;
  abstract createBeatmapIdNotSpecifiedMessage(
    server: OsuServer
  ): MaybeDeferred<TOutput>;
  abstract createNoMapPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[]
  ): MaybeDeferred<TOutput>;

  unparse(args: ChatLeaderboardOnMapExecutionArgs): string {
    const tokens = [
      SERVER_PREFIX.unparse(args.server),
      this.COMMAND_PREFIX.unparse(this.prefixes[0]),
    ];
    if (args.beatmapId !== undefined) {
      tokens.push(BEATMAP_ID.unparse(args.beatmapId));
    }
    if (args.usernameList !== undefined) {
      tokens.push(USERNAME_LIST.unparse(args.usernameList));
    }
    if (args.modPatterns !== undefined) {
      tokens.push(MOD_PATTERNS.unparse(args.modPatterns));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type ChatLeaderboardOnMapExecutionArgs = {
  server: OsuServer;
  beatmapId?: number;
  usernameList?: {usernames: string[]; isAdditive: boolean};
  modPatterns?: ModPatternsArg;
};

export type ChatLeaderboardOnMapViewParams = {
  server: OsuServer;
  usernames: string[];
  beatmapIdInput: number | undefined;
  mode: OsuRuleset | undefined;
  map: OsuMap | undefined;
  plays: OsuMapUserBestPlays[] | undefined;
  missingUsernames: string[] | undefined;
  isOnlyLocalMembersLb: boolean;
};
