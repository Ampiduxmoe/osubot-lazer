import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {
  OsuMap,
  OsuMapUserPlay,
} from '../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';
import {GetBeatmapUsersBestScoresUseCase} from '../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {clamp} from '../../primitives/Numbers';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {
  BEATMAP_ID,
  MODS,
  OWN_COMMAND_PREFIX,
  QUANTITY,
  SERVER_PREFIX,
  START_POSITION,
  USERNAME,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {ModArg} from '../common/arg_processing/ModArg';
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
    {argument: MODS, isOptional: true},
  ];

  textProcessor: TextProcessor;
  getInitiatorAppUserId: GetInitiatorAppUserId<TContext>;
  getTargetAppUserId: GetTargetAppUserId<TContext>;
  getContextualBeatmapIds: GetContextualBeatmapIds<TContext>;
  getLastSeenBeatmapId: GetLastSeenBeatmapId<TContext>;
  saveLastSeenBeatmapId: SaveLastSeenBeatmapId<TContext>;
  getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    textProcessor: TextProcessor,
    getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    getTargetAppUserId: GetTargetAppUserId<TContext>,
    getContextualBeatmapIds: GetContextualBeatmapIds<TContext>,
    getLastSeenBeatmapId: GetLastSeenBeatmapId<TContext>,
    saveLastSeenBeatmapId: SaveLastSeenBeatmapId<TContext>,
    getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(UserBestPlaysOnMap.commandStructure);
    this.textProcessor = textProcessor;
    this.getInitiatorAppUserId = getInitiatorAppUserId;
    this.getTargetAppUserId = getTargetAppUserId;
    this.getContextualBeatmapIds = getContextualBeatmapIds;
    this.getLastSeenBeatmapId = getLastSeenBeatmapId;
    this.saveLastSeenBeatmapId = saveLastSeenBeatmapId;
    this.getBeatmapBestScores = getBeatmapBestScores;
    this.getAppUserInfo = getAppUserInfo;
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
    const mods = argsProcessor.use(MODS).extract();
    const startPosition = argsProcessor.use(START_POSITION).extract();
    const quantity = argsProcessor.use(QUANTITY).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: server,
      beatmapId: beatmapId,
      username: username,
      mods: mods,
      startPosition: startPosition,
      quantity: quantity,
    });
  }

  async process(
    args: UserBestPlaysOnMapExecutionArgs,
    ctx: TContext
  ): Promise<UserBestPlaysOnMapViewParams> {
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
        startPosition: undefined,
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
        startPosition: undefined,
      };
    }
    const leaderboardResponse = await this.getBeatmapBestScores.execute({
      initiatorAppUserId: this.getInitiatorAppUserId(ctx),
      server: args.server,
      beatmapId: beatmapId,
      usernames: [username],
      startPosition: Math.max(args.startPosition ?? 1, 1),
      quantityPerUser: clamp(args.quantity ?? 1, 1, 10),
      mods: args.mods ?? [],
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
            startPosition: undefined,
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
        map: leaderboardResponse.map!,
        plays: undefined,
        startPosition: undefined,
      };
    }
    const mapPlays =
      args.quantity === undefined && args.startPosition !== undefined
        ? leaderboardResponse.mapPlays![0].plays.slice(0, args.startPosition)
        : leaderboardResponse.mapPlays![0].plays.slice(
            0,
            (args.startPosition ?? 1) + (args.quantity ?? 1) - 1
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
      map: leaderboardResponse.map!,
      plays: mapPlays,
      startPosition: args.startPosition ?? 1,
    };
  }

  createOutputMessage(params: UserBestPlaysOnMapViewParams): Promise<TOutput> {
    const {server, beatmapIdInput, usernameInput, username, mode, map, plays} =
      params;
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
    return this.createMapPlaysMessage(map, plays, server, mode!, username);
  }

  abstract createMapPlaysMessage(
    map: OsuMap,
    mapPlays: OsuMapUserPlay[],
    server: OsuServer,
    mode: OsuRuleset,
    username: string
  ): Promise<TOutput>;
  abstract createMapNotFoundMessage(
    server: OsuServer,
    mapId: number
  ): Promise<TOutput>;
  abstract createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): Promise<TOutput>;
  abstract createUsernameNotBoundMessage(server: OsuServer): Promise<TOutput>;
  abstract createBeatmapIdNotSpecifiedMessage(
    server: OsuServer
  ): Promise<TOutput>;
  abstract createNoMapPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset
  ): Promise<TOutput>;

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
    if (args.mods !== undefined) {
      tokens.push(MODS.unparse(args.mods));
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
  mods: ModArg[] | undefined;
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
  plays: OsuMapUserPlay[] | undefined;
  startPosition: number | undefined;
};
