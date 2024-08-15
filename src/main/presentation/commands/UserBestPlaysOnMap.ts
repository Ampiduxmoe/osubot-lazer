import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {
  OsuMap,
  OsuMapUserPlay,
} from '../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';
import {GetBeatmapUsersBestScoresUseCase} from '../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {ModPatternCollection} from '../../primitives/ModPatternCollection';
import {clamp} from '../../primitives/Numbers';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
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
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {
  NOTICE_ABOUT_SPACES_IN_USERNAMES,
  TextCommand,
} from './base/TextCommand';
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
  notice = NOTICE_ABOUT_SPACES_IN_USERNAMES;

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
    protected getAppUserInfo: GetAppUserInfoUseCase
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
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    if (server === undefined || ownPrefix === undefined) {
      return fail;
    }
    const beatmapId = argsProcessor.use(BEATMAP_ID).extract();
    const username = argsProcessor.use(USERNAME).extract();
    const modPatterns = argsProcessor.use(MOD_PATTERNS).extract();
    const startPosition = argsProcessor.use(START_POSITION).extract();
    const quantity = argsProcessor.use(QUANTITY).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
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
      const username = await (async () => {
        if (args.username !== undefined) {
          return args.username;
        }
        const appUserInfoResponse = await this.getAppUserInfo.execute({
          id: this.getTargetAppUserId(ctx, {canTargetOthersAsNonAdmin: true}),
          server: args.server,
        });
        return appUserInfoResponse.userInfo?.username;
      })();
      if (username === undefined) {
        return {
          server: args.server,
          beatmapIdInput: args.beatmapId,
          usernameInput: undefined,
          username: undefined,
          mode: undefined,
          map: undefined,
          plays: undefined,
          quantity: undefined,
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
          username: username,
          mode: undefined,
          map: undefined,
          plays: undefined,
          quantity: undefined,
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
              username: username,
              mode: undefined,
              map: undefined,
              plays: undefined,
              quantity: undefined,
            };
        }
      }
      if (leaderboardResponse.mapPlays!.length === 0) {
        return {
          server: args.server,
          beatmapIdInput: args.beatmapId,
          usernameInput: args.username,
          username: username,
          mode: leaderboardResponse.ruleset!,
          map: leaderboardResponse.baseBeatmap!,
          plays: undefined,
          quantity: undefined,
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
      return {
        server: args.server,
        beatmapIdInput: args.beatmapId,
        usernameInput: args.username,
        username: leaderboardResponse.mapPlays![0].username,
        mode: leaderboardResponse.ruleset!,
        map: leaderboardResponse.baseBeatmap!,
        plays: mapPlays,
        quantity: args.quantity ?? 1,
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
      username,
      mode,
      map,
      plays,
      quantity,
    } = params;
    if (username === undefined) {
      if (usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(server);
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
      return this.createNoMapPlaysMessage(server, mode!);
    }
    return this.createMapPlaysMessage(
      map,
      plays,
      quantity!,
      server,
      mode!,
      username
    );
  }

  abstract createMapPlaysMessage(
    map: OsuMap,
    mapPlays: UserPlayCollection,
    quantity: number,
    server: OsuServer,
    mode: OsuRuleset,
    username: string
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
    server: OsuServer
  ): MaybeDeferred<TOutput>;
  abstract createBeatmapIdNotSpecifiedMessage(
    server: OsuServer
  ): MaybeDeferred<TOutput>;
  abstract createNoMapPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset
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
  beatmapId: number | undefined;
  username: string | undefined;
  modPatterns: ModPatternsArg | undefined;
  startPosition: number | undefined;
  quantity: number | undefined;
};

export type UserBestPlaysOnMapViewParams = {
  server: OsuServer;
  beatmapIdInput: number | undefined;
  usernameInput: string | undefined;
  username: string | undefined;
  mode: OsuRuleset | undefined;
  map: OsuMap | undefined;
  plays: UserPlayCollection | undefined;
  quantity: number | undefined;
};

type UserPlayCollection = {playResult: OsuMapUserPlay; mapInfo: OsuMap}[];
