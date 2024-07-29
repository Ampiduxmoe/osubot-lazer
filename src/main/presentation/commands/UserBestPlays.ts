import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuUserBestPlays} from '../../application/usecases/get_user_best_plays/GetUserBestPlaysResponse';
import {GetUserBestPlaysUseCase} from '../../application/usecases/get_user_best_plays/GetUserBestPlaysUseCase';
import {ModCombinationPattern} from '../../primitives/ModCombinationPattern';
import {clamp} from '../../primitives/Numbers';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {
  MOD_PATTERNS,
  MODE,
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
import {VkBeatmapCoversRepository} from '../data/repositories/VkBeatmapCoversRepository';
import {
  NOTICE_ABOUT_SPACES_IN_USERNAMES,
  TextCommand,
} from './base/TextCommand';
import {
  GetInitiatorAppUserId,
  GetTargetAppUserId,
  SaveLastSeenBeatmapId,
} from './common/Signatures';

export abstract class UserBestPlays<TContext, TOutput> extends TextCommand<
  UserBestPlaysExecutionArgs,
  UserBestPlaysViewParams,
  TContext,
  TOutput
> {
  internalName = UserBestPlays.name;
  shortDescription = 'топ скоры игрока';
  longDescription = 'Отображает лучшие скоры игрока';
  notice = NOTICE_ABOUT_SPACES_IN_USERNAMES;

  static prefixes = new CommandPrefixes('p', 'pb', 'PersonalBest');
  prefixes = UserBestPlays.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserBestPlays.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: START_POSITION, isOptional: true},
    {argument: QUANTITY, isOptional: true},
    {argument: MOD_PATTERNS, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  textProcessor: TextProcessor;
  getInitiatorAppUserId: GetInitiatorAppUserId<TContext>;
  getTargetAppUserId: GetTargetAppUserId<TContext>;
  saveLastSeenBeatmapId: SaveLastSeenBeatmapId<TContext>;
  getUserBestPlays: GetUserBestPlaysUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  vkBeatmapCovers: VkBeatmapCoversRepository;
  constructor(
    textProcessor: TextProcessor,
    getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    getTargetAppUserId: GetTargetAppUserId<TContext>,
    saveLastSeenBeatmapId: SaveLastSeenBeatmapId<TContext>,
    getUserBestPlays: GetUserBestPlaysUseCase,
    getAppUserInfo: GetAppUserInfoUseCase,
    vkBeatmapCovers: VkBeatmapCoversRepository
  ) {
    super(UserBestPlays.commandStructure);
    this.textProcessor = textProcessor;
    this.getInitiatorAppUserId = getInitiatorAppUserId;
    this.getTargetAppUserId = getTargetAppUserId;
    this.saveLastSeenBeatmapId = saveLastSeenBeatmapId;
    this.getUserBestPlays = getUserBestPlays;
    this.getAppUserInfo = getAppUserInfo;
    this.vkBeatmapCovers = vkBeatmapCovers;
  }

  matchText(text: string): CommandMatchResult<UserBestPlaysExecutionArgs> {
    const fail = CommandMatchResult.fail<UserBestPlaysExecutionArgs>();
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
    const startPosition = argsProcessor.use(START_POSITION).extract();
    const quantity = argsProcessor.use(QUANTITY).extract();
    const modPatterns = argsProcessor.use(MOD_PATTERNS).extract();
    const mode = argsProcessor.use(MODE).extract();
    const username = argsProcessor.use(USERNAME).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: server,
      username: username,
      startPosition: startPosition,
      quantity: quantity,
      modPatterns: modPatterns,
      mode: mode,
    });
  }

  async process(
    args: UserBestPlaysExecutionArgs,
    ctx: TContext
  ): Promise<UserBestPlaysViewParams> {
    let username = args.username;
    let mode = args.mode;
    if (username === undefined) {
      const appUserInfoResponse = await this.getAppUserInfo.execute({
        id: this.getTargetAppUserId(ctx, {canTargetOthersAsNonAdmin: true}),
        server: args.server,
      });
      const boundUser = appUserInfoResponse.userInfo;
      if (boundUser === undefined) {
        return {
          server: args.server,
          mode: args.mode,
          usernameInput: undefined,
          bestPlays: undefined,
        };
      }
      username = boundUser.username;
      mode ??= boundUser.ruleset;
    }
    const startPosition = clamp(args.startPosition ?? 1, 1, 100);
    let quantity: number;
    if (args.startPosition === undefined) {
      quantity = clamp(args.quantity ?? 3, 1, 10);
    } else {
      quantity = clamp(args.quantity ?? 1, 1, 10);
    }
    const bestPlaysResult = await this.getUserBestPlays.execute({
      initiatorAppUserId: this.getInitiatorAppUserId(ctx),
      server: args.server,
      username: username,
      ruleset: mode,
      startPosition: startPosition,
      quantity: quantity,
      modPatterns: args.modPatterns ?? [],
    });
    if (bestPlaysResult.isFailure) {
      const internalFailureReason = bestPlaysResult.failureReason!;
      switch (internalFailureReason) {
        case 'user not found':
          return {
            server: args.server,
            mode: mode,
            usernameInput: args.username,
            bestPlays: undefined,
          };
      }
    }
    const bestPlays = bestPlaysResult.bestPlays!;
    if (bestPlays.plays.length === 1) {
      await this.saveLastSeenBeatmapId(
        ctx,
        args.server,
        bestPlays.plays[0].beatmap.id
      );
    }
    return {
      server: args.server,
      mode: bestPlaysResult.ruleset!,
      usernameInput: args.username,
      bestPlays: bestPlays,
    };
  }

  createOutputMessage(params: UserBestPlaysViewParams): Promise<TOutput> {
    const {server, mode, bestPlays} = params;
    if (bestPlays === undefined) {
      if (params.usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(params.server);
      }
      return this.createUserNotFoundMessage(
        params.server,
        params.usernameInput
      );
    }
    if (bestPlays.plays.length === 0) {
      return this.createNoBestPlaysMessage(server, mode!);
    }
    return this.createBestPlaysMessage(bestPlays, server, mode!);
  }

  abstract createBestPlaysMessage(
    bestPlays: OsuUserBestPlays,
    server: OsuServer,
    mode: OsuRuleset
  ): Promise<TOutput>;
  abstract createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): Promise<TOutput>;
  abstract createUsernameNotBoundMessage(server: OsuServer): Promise<TOutput>;
  abstract createNoBestPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset
  ): Promise<TOutput>;

  unparse(args: UserBestPlaysExecutionArgs): string {
    const tokens = [
      SERVER_PREFIX.unparse(args.server),
      this.COMMAND_PREFIX.unparse(this.prefixes[0]),
    ];
    if (args.username !== undefined) {
      tokens.push(USERNAME.unparse(args.username));
    }
    if (args.startPosition !== undefined) {
      tokens.push(START_POSITION.unparse(args.startPosition));
    }
    if (args.quantity !== undefined) {
      tokens.push(QUANTITY.unparse(args.quantity));
    }
    if (args.modPatterns !== undefined) {
      tokens.push(MOD_PATTERNS.unparse(args.modPatterns));
    }
    if (args.mode !== undefined) {
      tokens.push(MODE.unparse(args.mode));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type UserBestPlaysExecutionArgs = {
  server: OsuServer;
  username: string | undefined;
  startPosition: number | undefined;
  quantity: number | undefined;
  modPatterns: ModCombinationPattern[] | undefined;
  mode: OsuRuleset | undefined;
};

export type UserBestPlaysViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  usernameInput: string | undefined;
  bestPlays: OsuUserBestPlays | undefined;
};
