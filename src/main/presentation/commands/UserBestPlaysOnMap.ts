import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {
  OsuMap,
  OsuMapUserPlay,
} from '../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';
import {GetBeatmapUsersBestScoresUseCase} from '../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {SetUsernameUseCase} from '../../application/usecases/set_username/SetUsernameUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {ModPatternCollection} from '../../primitives/ModPatternCollection';
import {clamp} from '../../primitives/Numbers';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {CommandArgument} from '../common/arg_processing/CommandArgument';
import {
  BEATMAP_ID,
  MOD_PATTERNS,
  ModPatternsArg,
  OWN_COMMAND_PREFIX,
  QUANTITY,
  SERVER_PREFIX,
  START_POSITION,
  USERNAME,
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
import {DiffBrief} from './common/DiffBrief';
import {BeatmapsetDiffBriefProvider} from './common/DiffBriefProvider';
import {LinkUsernameResult} from './common/LinkUsernameResult';
import {
  GetContextualBeatmapIds,
  GetInitiatorAppUserId,
  GetLastSeenBeatmapId,
  GetTargetAppUserId,
  SaveLastSeenBeatmapId,
} from './common/Signatures';

export abstract class UserBestPlaysOnMap<TContext, TOutput> extends TextCommand<
  UserBestPlaysOnMapExecutionArgs,
  UserBestPlaysOnMapViewParams,
  TContext,
  TOutput
> {
  internalName = UserBestPlaysOnMap.name;
  shortDescription = 'топ скоры игрока на карте';
  longDescription = 'Показывает ваши лучшие скоры выбранной на карте';
  notices = [NOTICE_ABOUT_SPACES_IN_USERNAMES];

  static prefixes = new CommandPrefixes('mp', 'mpb', 'MapPersonalBest');
  prefixes = UserBestPlaysOnMap.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserBestPlaysOnMap.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: BEATMAP_ID, isOptional: true},
    {argument: USERNAME, isOptional: true},
    {argument: START_POSITION, isOptional: true},
    {argument: QUANTITY, isOptional: true},
    {argument: MOD_PATTERNS, isOptional: true},
  ];

  constructor(
    public textProcessor: TextProcessor,
    protected getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    protected getTargetAppUserId: GetTargetAppUserId<TContext>,
    protected getContextualBeatmapIds: GetContextualBeatmapIds<TContext>,
    protected getLastSeenBeatmapId: GetLastSeenBeatmapId<TContext>,
    protected saveLastSeenBeatmapId: SaveLastSeenBeatmapId<TContext>,
    protected getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase,
    protected getAppUserInfo: GetAppUserInfoUseCase,
    protected beatmapsetDiffsProvider: BeatmapsetDiffBriefProvider,
    protected setUsername: SetUsernameUseCase
  ) {
    super(UserBestPlaysOnMap.commandStructure);
  }

  matchText(text: string): CommandMatchResult<UserBestPlaysOnMapExecutionArgs> {
    const fail = CommandMatchResult.fail<UserBestPlaysOnMapExecutionArgs>();
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
    const usernameRes = argsProcessor.use(USERNAME).extractWithToken();
    const modPatternsRes = argsProcessor.use(MOD_PATTERNS).extractWithToken();
    const startPositionRes = argsProcessor
      .use(START_POSITION)
      .extractWithToken();
    const quantityRes = argsProcessor.use(QUANTITY).extractWithToken();

    if (argsProcessor.remainingTokens.length > 0) {
      let extractionResults = [
        [...serverRes, SERVER_PREFIX],
        [...ownPrefixRes, this.COMMAND_PREFIX],
        [...beatmapIdRes, BEATMAP_ID],
        [...usernameRes, USERNAME],
        [...modPatternsRes, MOD_PATTERNS],
        [...startPositionRes, START_POSITION],
        [...quantityRes, QUANTITY],
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
    const username = usernameRes[0];
    const modPatterns = modPatternsRes[0];
    const startPosition = startPositionRes[0];
    const quantity = quantityRes[0];
    return CommandMatchResult.ok({
      server: server,
      beatmapId: beatmapId,
      username: username,
      modPatterns: modPatterns,
      startPosition: startPosition,
      quantity: quantity,
    });
  }

  process(
    args: UserBestPlaysOnMapExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<UserBestPlaysOnMapViewParams> {
    const valuePromise: Promise<UserBestPlaysOnMapViewParams> = (async () => {
      const initiatorAppUserId = this.getInitiatorAppUserId(ctx);
      const targetAppUserId = this.getTargetAppUserId(ctx, {
        canTargetOthersAsNonAdmin: true,
      });
      const username = await (async () => {
        if (args.username !== undefined) {
          return args.username;
        }
        const appUserInfoResponse = await this.getAppUserInfo.execute({
          id: targetAppUserId,
          server: args.server,
        });
        return appUserInfoResponse.userInfo?.username;
      })();
      if (username === undefined) {
        return {
          server: args.server,
          beatmapIdInput: args.beatmapId,
          usernameInput: undefined,
          setUsername:
            initiatorAppUserId !== targetAppUserId
              ? undefined
              : async username => {
                  const result = await this.setUsername.execute({
                    appUserId: targetAppUserId,
                    server: args.server,
                    username: username,
                    mode: undefined,
                  });
                  return result.isFailure
                    ? undefined
                    : {username: result.username!, mode: result.mode!};
                },
          retryWithUsername: username => this.process({...args, username}, ctx),
          username: undefined,
          mode: undefined,
          map: undefined,
          plays: undefined,
          quantity: undefined,
          beatmapsetDiffs: undefined,
          getViewParamsForMap: undefined,
        };
      }
      const beatmapId: number | undefined = await (async () => {
        if (args.beatmapId !== undefined) {
          return args.beatmapId;
        }
        const closestIds = this.getContextualBeatmapIds(ctx);
        if (closestIds.length === 1) {
          return closestIds[0].id;
        }
        return await this.getLastSeenBeatmapId(ctx, args.server);
      })();
      if (beatmapId === undefined) {
        return {
          server: args.server,
          beatmapIdInput: undefined,
          usernameInput: args.username,
          setUsername: undefined,
          retryWithUsername: undefined,
          username: username,
          mode: undefined,
          map: undefined,
          plays: undefined,
          quantity: undefined,
          beatmapsetDiffs: undefined,
          getViewParamsForMap: undefined,
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
        initiatorAppUserId: initiatorAppUserId,
        server: args.server,
        beatmapId: beatmapId,
        usernames: [username],
        startPosition: Math.max(args.startPosition ?? 1, 1),
        quantityPerUser: clamp(args.quantity ?? 10, 1, 10),
        modPatterns: modPatterns,
      });
      if (leaderboardResponse.failureReason !== undefined) {
        switch (leaderboardResponse.failureReason) {
          case 'beatmap not found':
            return {
              server: args.server,
              beatmapIdInput: args.beatmapId,
              usernameInput: args.username,
              setUsername: undefined,
              retryWithUsername: undefined,
              username: username,
              mode: undefined,
              map: undefined,
              plays: undefined,
              quantity: undefined,
              beatmapsetDiffs: undefined,
              getViewParamsForMap: undefined,
            };
        }
      }
      const getViewParamsForMap = async (
        id: number
      ): Promise<UserBestPlaysOnMapViewParams> => {
        return await this.process(
          {
            server: args.server,
            beatmapId: id,
            username: args.username,
            modPatterns: args.modPatterns,
            startPosition: args.startPosition,
            quantity: args.quantity,
          },
          ctx
        ).resultValue;
      };
      if (
        leaderboardResponse.missingUsernames!.includes(username) ||
        (leaderboardResponse.mapPlays !== undefined &&
          leaderboardResponse.mapPlays[0].collection.length === 0)
      ) {
        const beatmapsetDiffs =
          await this.beatmapsetDiffsProvider.getByBeatmapId(
            initiatorAppUserId,
            args.server,
            beatmapId
          );
        return {
          server: args.server,
          beatmapIdInput: args.beatmapId,
          usernameInput: args.username,
          setUsername: undefined,
          retryWithUsername: undefined,
          username: leaderboardResponse.missingUsernames!.includes(username)
            ? undefined
            : leaderboardResponse.mapPlays![0].username,
          mode: leaderboardResponse.ruleset!,
          map: leaderboardResponse.baseBeatmap!,
          plays: undefined,
          quantity: undefined,
          beatmapsetDiffs: beatmapsetDiffs,
          getViewParamsForMap: getViewParamsForMap,
        };
      }
      const mapPlays =
        args.quantity === undefined && args.startPosition !== undefined
          ? leaderboardResponse.mapPlays![0].collection.slice(
              0,
              args.startPosition
            )
          : leaderboardResponse.mapPlays![0].collection.slice(
              0,
              (args.startPosition ?? 1) + (args.quantity ?? 10) - 1
            );
      if (beatmapId !== undefined) {
        await this.saveLastSeenBeatmapId(ctx, args.server, beatmapId);
      }
      // Get diffs by beatmapset ID to avoid unnecessary API requests to get it
      const beatmapsetDiffs = await this.beatmapsetDiffsProvider.get(
        this.getInitiatorAppUserId(ctx),
        args.server,
        leaderboardResponse.mapPlays![0].collection[0].mapInfo.beatmapset.id
      );
      return {
        server: args.server,
        beatmapIdInput: args.beatmapId,
        usernameInput: args.username,
        setUsername: undefined,
        retryWithUsername: undefined,
        username: leaderboardResponse.mapPlays![0].username,
        mode: leaderboardResponse.ruleset!,
        map: leaderboardResponse.baseBeatmap!,
        plays: mapPlays,
        quantity: args.quantity ?? 1,
        beatmapsetDiffs: beatmapsetDiffs,
        getViewParamsForMap: getViewParamsForMap,
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(
    params: UserBestPlaysOnMapViewParams
  ): MaybeDeferred<TOutput> {
    const {
      server,
      beatmapIdInput,
      usernameInput,
      setUsername,
      retryWithUsername,
      username,
      mode,
      map,
      plays,
      quantity,
      beatmapsetDiffs,
      getViewParamsForMap,
    } = params;
    if (username === undefined) {
      if (usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(
          server,
          setUsername,
          retryWithUsername!
        );
      }
      return this.createUserNotFoundMessage(server, usernameInput);
    }
    if (map === undefined) {
      if (beatmapIdInput === undefined) {
        return this.createBeatmapIdNotSpecifiedMessage(server);
      }
      return this.createMapNotFoundMessage(server, beatmapIdInput);
    }
    if (plays === undefined) {
      return this.createNoMapPlaysMessage(
        map,
        server,
        username,
        mode!,
        beatmapsetDiffs!,
        getViewParamsForMap!
      );
    }
    return this.createMapPlaysMessage(
      map,
      plays,
      quantity!,
      server,
      mode!,
      username,
      beatmapsetDiffs!,
      getViewParamsForMap!
    );
  }

  abstract createMapPlaysMessage(
    map: OsuMap,
    mapPlays: UserPlayCollection,
    quantity: number,
    server: OsuServer,
    mode: OsuRuleset,
    username: string,
    beatmapsetDiffs: DiffBrief[],
    getViewParamsForMap: (
      mapId: number
    ) => Promise<UserBestPlaysOnMapViewParams>
  ): MaybeDeferred<TOutput>;
  abstract createMapNotFoundMessage(
    server: OsuServer,
    mapId: number
  ): MaybeDeferred<TOutput>;
  abstract createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): MaybeDeferred<TOutput>;
  abstract createUsernameNotBoundMessage(
    server: OsuServer,
    setUsername:
      | ((username: string) => Promise<LinkUsernameResult | undefined>)
      | undefined,
    retryWithUsername: (
      username?: string
    ) => MaybeDeferred<UserBestPlaysOnMapViewParams>
  ): MaybeDeferred<TOutput>;
  abstract createBeatmapIdNotSpecifiedMessage(
    server: OsuServer
  ): MaybeDeferred<TOutput>;
  abstract createNoMapPlaysMessage(
    map: OsuMap,
    server: OsuServer,
    username: string,
    mode: OsuRuleset,
    beatmapsetDiffs: DiffBrief[],
    getViewParamsForMap: (
      mapId: number
    ) => Promise<UserBestPlaysOnMapViewParams>
  ): MaybeDeferred<TOutput>;

  unparse(args: UserBestPlaysOnMapExecutionArgs): string {
    const tokens = [
      SERVER_PREFIX.unparse(args.server),
      this.COMMAND_PREFIX.unparse(this.prefixes[0]),
    ];
    if (args.beatmapId !== undefined) {
      tokens.push(BEATMAP_ID.unparse(args.beatmapId));
    }
    if (args.username !== undefined) {
      tokens.push(USERNAME.unparse(args.username));
    }
    if (args.modPatterns !== undefined) {
      tokens.push(MOD_PATTERNS.unparse(args.modPatterns));
    }
    if (args.startPosition !== undefined) {
      tokens.push(START_POSITION.unparse(args.startPosition));
    }
    if (args.quantity !== undefined) {
      tokens.push(QUANTITY.unparse(args.quantity));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type UserBestPlaysOnMapExecutionArgs = {
  server: OsuServer;
  beatmapId?: number;
  username?: string;
  modPatterns?: ModPatternsArg;
  startPosition?: number;
  quantity?: number;
};

export type UserBestPlaysOnMapViewParams = {
  server: OsuServer;
  beatmapIdInput: number | undefined;
  usernameInput: string | undefined;
  setUsername:
    | ((username: string) => Promise<LinkUsernameResult | undefined>)
    | undefined;
  retryWithUsername:
    | ((username?: string) => MaybeDeferred<UserBestPlaysOnMapViewParams>)
    | undefined;
  username: string | undefined;
  mode: OsuRuleset | undefined;
  map: OsuMap | undefined;
  plays: UserPlayCollection | undefined;
  quantity: number | undefined;
  beatmapsetDiffs: DiffBrief[] | undefined;
  getViewParamsForMap:
    | ((mapId: number) => Promise<UserBestPlaysOnMapViewParams>)
    | undefined;
};

type UserPlayCollection = {playResult: OsuMapUserPlay; mapInfo: OsuMap}[];
