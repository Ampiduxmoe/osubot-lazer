import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {
  OsuMap,
  OsuMapUserBestPlays,
} from '../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';
import {GetBeatmapUsersBestScoresUseCase} from '../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {
  BEATMAP_ID,
  MODS,
  OWN_COMMAND_PREFIX,
  SERVER_PREFIX,
  USERNAME_LIST,
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
  notice = NOTICE_ABOUT_SPACES_IN_USERNAMES;

  static prefixes = new CommandPrefixes('ml', 'mlb', 'MapLeaderboard');
  prefixes = ChatLeaderboardOnMap.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = ChatLeaderboardOnMap.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: BEATMAP_ID, isOptional: true},
    {argument: USERNAME_LIST, isOptional: true},
    {argument: MODS, isOptional: true},
  ];

  textProcessor: TextProcessor;
  getInitiatorAppUserId: (ctx: TContext) => string;
  getLocalAppUserIds: (ctx: TContext) => Promise<string[]>;
  getLastSeenBeatmapId: (
    ctx: TContext,
    server: OsuServer
  ) => Promise<number | undefined>;
  saveLastSeenBeatmapId: (
    ctx: TContext,
    server: OsuServer,
    beatmapId: number
  ) => Promise<void>;
  getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    textProcessor: TextProcessor,
    getInitiatorAppUserId: (ctx: TContext) => string,
    getLocalAppUserIds: (ctx: TContext) => Promise<string[]>,
    getLastSeenBeatmapId: (
      ctx: TContext,
      server: OsuServer
    ) => Promise<number | undefined>,
    saveLastSeenBeatmapId: (
      ctx: TContext,
      server: OsuServer,
      beatmapId: number
    ) => Promise<void>,
    getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(ChatLeaderboardOnMap.commandStructure);
    this.textProcessor = textProcessor;
    this.getInitiatorAppUserId = getInitiatorAppUserId;
    this.getLocalAppUserIds = getLocalAppUserIds;
    this.getLastSeenBeatmapId = getLastSeenBeatmapId;
    this.saveLastSeenBeatmapId = saveLastSeenBeatmapId;
    this.getBeatmapBestScores = getBeatmapBestScores;
    this.getAppUserInfo = getAppUserInfo;
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
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    if (server === undefined || ownPrefix === undefined) {
      return fail;
    }
    const beatmapId = argsProcessor.use(BEATMAP_ID).extract();
    const usernameList = argsProcessor.use(USERNAME_LIST).extract();
    const mods = argsProcessor.use(MODS).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: server,
      beatmapId: beatmapId,
      usernameList: usernameList,
      mods: mods,
    });
  }

  async process(
    args: ChatLeaderboardOnMapExecutionArgs,
    ctx: TContext
  ): Promise<ChatLeaderboardOnMapViewParams> {
    const usernames = await (async () => {
      if (args.usernameList === undefined || args.usernameList.isAdditive) {
        const localMembers = await this.getLocalAppUserIds(ctx);
        const appUserInfoResponses = await Promise.all(
          localMembers.map(appUserId =>
            this.getAppUserInfo.execute({
              id: appUserId,
              server: args.server,
            })
          )
        );
        const localUsernames = appUserInfoResponses
          .filter(x => x.userInfo !== undefined)
          .map(x => x.userInfo!.username);
        return [...localUsernames, ...(args.usernameList?.usernames ?? [])];
      }
      return args.usernameList.usernames;
    })();
    const isOnlyLocalMembersLb =
      args.usernameList === undefined || args.usernameList.isAdditive;
    if (usernames.length === 0) {
      return {
        server: args.server,
        usernames: [],
        beatmapIdInput: args.beatmapId,
        mode: undefined,
        map: undefined,
        plays: undefined,
        missingUsernames: undefined,
        isOnlyLocalMembersLb: isOnlyLocalMembersLb,
      };
    }
    const beatmapId =
      args.beatmapId ?? (await this.getLastSeenBeatmapId(ctx, args.server));
    if (beatmapId === undefined) {
      return {
        server: args.server,
        usernames: usernames,
        beatmapIdInput: undefined,
        mode: undefined,
        map: undefined,
        plays: undefined,
        missingUsernames: undefined,
        isOnlyLocalMembersLb: isOnlyLocalMembersLb,
      };
    }
    const leaderboardResponse = await this.getBeatmapBestScores.execute({
      appUserId: this.getInitiatorAppUserId(ctx),
      server: args.server,
      beatmapId: beatmapId,
      usernames: usernames,
      startPosition: 1,
      quantityPerUser: 1,
      mods: args.mods ?? [],
    });
    if (leaderboardResponse.failureReason !== undefined) {
      switch (leaderboardResponse.failureReason) {
        case 'beatmap not found':
          return {
            server: args.server,
            usernames: usernames,
            beatmapIdInput: args.beatmapId,
            mode: undefined,
            map: undefined,
            plays: undefined,
            missingUsernames: undefined,
            isOnlyLocalMembersLb: isOnlyLocalMembersLb,
          };
      }
    }
    if (args.beatmapId !== undefined) {
      await this.saveLastSeenBeatmapId(ctx, args.server, args.beatmapId);
    }
    return {
      server: args.server,
      usernames: usernames,
      beatmapIdInput: args.beatmapId,
      mode: leaderboardResponse.ruleset!,
      map: leaderboardResponse.map!,
      plays: leaderboardResponse.mapPlays!,
      missingUsernames: leaderboardResponse.missingUsernames!,
      isOnlyLocalMembersLb: isOnlyLocalMembersLb,
    };
  }

  createOutputMessage(
    params: ChatLeaderboardOnMapViewParams
  ): Promise<TOutput> {
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
  ): Promise<TOutput>;
  abstract createMapNotFoundMessage(
    server: OsuServer,
    mapId: number
  ): Promise<TOutput>;
  abstract createNoUsernamesMessage(server: OsuServer): Promise<TOutput>;
  abstract createBeatmapIdNotSpecifiedMessage(
    server: OsuServer
  ): Promise<TOutput>;
  abstract createNoMapPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[]
  ): Promise<TOutput>;

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
    if (args.mods !== undefined) {
      tokens.push(MODS.unparse(args.mods));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type ChatLeaderboardOnMapExecutionArgs = {
  server: OsuServer;
  beatmapId: number | undefined;
  usernameList: {usernames: string[]; isAdditive: boolean} | undefined;
  mods: ModArg[] | undefined;
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
