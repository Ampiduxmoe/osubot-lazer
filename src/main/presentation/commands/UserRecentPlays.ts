import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuUserRecentPlays} from '../../application/usecases/get_user_recent_plays/GetUserRecentPlaysResponse';
import {GetUserRecentPlaysUseCase} from '../../application/usecases/get_user_recent_plays/GetUserRecentPlaysUseCase';
import {clamp} from '../../primitives/Numbers';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {
  MODE,
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

export abstract class UserRecentPlays<TContext, TOutput> extends TextCommand<
  UserRecentPlaysExecutionArgs,
  UserRecentPlaysViewParams,
  TContext,
  TOutput
> {
  internalName = UserRecentPlays.name;
  shortDescription = 'последние скоры';
  longDescription =
    'Отображает последние скоры игрока\n' +
    'Используйте ' +
    UserRecentPlays.recentPlaysPrefixes.map(s => `«${s}»`).join(' или ') +
    ' для всех скоров, и ' +
    UserRecentPlays.recentPassesPrefixes.map(s => `«${s}»`).join(' или ') +
    ' для пассов';
  notice = NOTICE_ABOUT_SPACES_IN_USERNAMES;

  static recentPlaysPrefixes = new CommandPrefixes('r', 'Recent');
  static recentPassesPrefixes = new CommandPrefixes('rp', 'RecentPass');
  static prefixes = new CommandPrefixes(
    ...UserRecentPlays.recentPlaysPrefixes,
    ...UserRecentPlays.recentPassesPrefixes
  );
  prefixes = UserRecentPlays.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserRecentPlays.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: START_POSITION, isOptional: true},
    {argument: QUANTITY, isOptional: true},
    {argument: MODS, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  textProcessor: TextProcessor;
  getInitiatorAppUserId: (ctx: TContext) => string;
  getTargetAppUserId: (
    ctx: TContext,
    options: {canTargetOthersAsNonAdmin: boolean}
  ) => string;
  saveLastSeenBeatmapId: (
    ctx: TContext,
    server: OsuServer,
    beatmapId: number
  ) => Promise<void>;
  getRecentPlays: GetUserRecentPlaysUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    textProcessor: TextProcessor,
    getInitiatorAppUserId: (ctx: TContext) => string,
    getTargetAppUserId: (
      ctx: TContext,
      options: {canTargetOthersAsNonAdmin: boolean}
    ) => string,
    saveLastSeenBeatmapId: (
      ctx: TContext,
      server: OsuServer,
      beatmapId: number
    ) => Promise<void>,
    getRecentPlays: GetUserRecentPlaysUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(UserRecentPlays.commandStructure);
    this.textProcessor = textProcessor;
    this.getInitiatorAppUserId = getInitiatorAppUserId;
    this.getTargetAppUserId = getTargetAppUserId;
    this.saveLastSeenBeatmapId = saveLastSeenBeatmapId;
    this.getRecentPlays = getRecentPlays;
    this.getAppUserInfo = getAppUserInfo;
  }

  matchText(text: string): CommandMatchResult<UserRecentPlaysExecutionArgs> {
    const fail = CommandMatchResult.fail<UserRecentPlaysExecutionArgs>();
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
    const mods = argsProcessor.use(MODS).extract();
    const mode = argsProcessor.use(MODE).extract();
    const username = argsProcessor.use(USERNAME).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: server,
      passesOnly: UserRecentPlays.recentPassesPrefixes.includes(ownPrefix),
      username: username,
      startPosition: startPosition,
      quantity: quantity,
      mods: mods,
      mode: mode,
    });
  }

  async process(
    args: UserRecentPlaysExecutionArgs,
    ctx: TContext
  ): Promise<UserRecentPlaysViewParams> {
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
          passesOnly: args.passesOnly,
          usernameInput: undefined,
          recentPlays: undefined,
        };
      }
      username = boundUser.username;
      mode ??= boundUser.ruleset;
    }
    const mods = args.mods ?? [];
    const startPosition = clamp(args.startPosition ?? 1, 1, 100);
    const quantity = clamp(args.quantity ?? 1, 1, 10);
    const recentPlaysResult = await this.getRecentPlays.execute({
      appUserId: this.getInitiatorAppUserId(ctx),
      server: args.server,
      username: username,
      ruleset: mode,
      includeFails: !args.passesOnly,
      startPosition: startPosition,
      quantity: quantity,
      mods: mods,
    });
    if (recentPlaysResult.isFailure) {
      const internalFailureReason = recentPlaysResult.failureReason!;
      switch (internalFailureReason) {
        case 'user not found':
          return {
            server: args.server,
            mode: mode,
            passesOnly: args.passesOnly,
            usernameInput: args.username,
            recentPlays: undefined,
          };
      }
    }
    const recentPlays = recentPlaysResult.recentPlays!;
    if (recentPlays.plays.length === 1) {
      await this.saveLastSeenBeatmapId(
        ctx,
        args.server,
        recentPlays.plays[0].beatmap.id
      );
    }
    return {
      server: args.server,
      mode: recentPlaysResult.ruleset!,
      passesOnly: args.passesOnly,
      usernameInput: args.username,
      recentPlays: recentPlays,
    };
  }

  createOutputMessage(params: UserRecentPlaysViewParams): Promise<TOutput> {
    const {server, mode, passesOnly, recentPlays} = params;
    if (recentPlays === undefined) {
      if (params.usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(params.server);
      }
      return this.createUserNotFoundMessage(
        params.server,
        params.usernameInput
      );
    }
    const {username} = recentPlays;
    if (recentPlays.plays.length === 0) {
      return this.createNoRecentPlaysMessage(
        server,
        mode!,
        passesOnly,
        username
      );
    }
    return this.createRecentPlaysMessage(
      recentPlays,
      server,
      mode!,
      passesOnly
    );
  }

  abstract createRecentPlaysMessage(
    recentPlays: OsuUserRecentPlays,
    server: OsuServer,
    mode: OsuRuleset,
    passesOnly: boolean
  ): Promise<TOutput>;
  abstract createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): Promise<TOutput>;
  abstract createUsernameNotBoundMessage(server: OsuServer): Promise<TOutput>;
  abstract createNoRecentPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset,
    passesOnly: boolean,
    username: string
  ): Promise<TOutput>;

  unparse(args: UserRecentPlaysExecutionArgs): string {
    const tokens = [
      SERVER_PREFIX.unparse(args.server),
      this.COMMAND_PREFIX.unparse(
        args.passesOnly
          ? UserRecentPlays.recentPassesPrefixes[0]
          : UserRecentPlays.recentPlaysPrefixes[0]
      ),
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
    if (args.mods !== undefined) {
      tokens.push(MODS.unparse(args.mods));
    }
    if (args.mode !== undefined) {
      tokens.push(MODE.unparse(args.mode));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type UserRecentPlaysExecutionArgs = {
  server: OsuServer;
  passesOnly: boolean;
  username: string | undefined;
  startPosition: number | undefined;
  quantity: number | undefined;
  mods: ModArg[] | undefined;
  mode: OsuRuleset | undefined;
};

export type UserRecentPlaysViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  passesOnly: boolean;
  usernameInput: string | undefined;
  recentPlays: OsuUserRecentPlays | undefined;
};
