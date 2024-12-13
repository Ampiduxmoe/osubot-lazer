import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuUserRecentPlays} from '../../application/usecases/get_user_recent_plays/GetUserRecentPlaysResponse';
import {GetUserRecentPlaysUseCase} from '../../application/usecases/get_user_recent_plays/GetUserRecentPlaysUseCase';
import {SetUsernameUseCase} from '../../application/usecases/set_username/SetUsernameUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {ModPatternCollection} from '../../primitives/ModPatternCollection';
import {clamp} from '../../primitives/Numbers';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {CommandArgument} from '../common/arg_processing/CommandArgument';
import {
  MOD_PATTERNS,
  MODE,
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
import {LinkUsernameResult} from './common/LinkUsernameResult';
import {
  GetInitiatorAppUserId,
  GetTargetAppUserId,
  SaveLastSeenBeatmapId,
} from './common/Signatures';

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
  notices = [NOTICE_ABOUT_SPACES_IN_USERNAMES];

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
    {argument: MOD_PATTERNS, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  constructor(
    public textProcessor: TextProcessor,
    protected getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    protected getTargetAppUserId: GetTargetAppUserId<TContext>,
    protected saveLastSeenBeatmapId: SaveLastSeenBeatmapId<TContext>,
    protected getRecentPlays: GetUserRecentPlaysUseCase,
    protected getAppUserInfo: GetAppUserInfoUseCase,
    protected setUsername: SetUsernameUseCase
  ) {
    super(UserRecentPlays.commandStructure);
  }

  matchText(text: string): CommandMatchResult<UserRecentPlaysExecutionArgs> {
    const fail = CommandMatchResult.fail<UserRecentPlaysExecutionArgs>();
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
    const startPositionRes = argsProcessor
      .use(START_POSITION)
      .extractWithToken();
    const quantityRes = argsProcessor.use(QUANTITY).extractWithToken();
    const modPatternsRes = argsProcessor.use(MOD_PATTERNS).extractWithToken();
    const modeRes = argsProcessor.use(MODE).extractWithToken();
    const usernameRes = argsProcessor.use(USERNAME).extractWithToken();

    if (argsProcessor.remainingTokens.length > 0) {
      let extractionResults = [
        [...serverRes, SERVER_PREFIX],
        [...ownPrefixRes, this.COMMAND_PREFIX],
        [...startPositionRes, START_POSITION],
        [...quantityRes, QUANTITY],
        [...modPatternsRes, MOD_PATTERNS],
        [...modeRes, MODE],
        [...usernameRes, USERNAME],
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
    const ownPrefix = ownPrefixRes[0];
    const startPosition = startPositionRes[0];
    const quantity = quantityRes[0];
    const modPatterns = modPatternsRes[0];
    const mode = modeRes[0];
    const username = usernameRes[0];
    return CommandMatchResult.ok({
      server: server,
      passesOnly: UserRecentPlays.recentPassesPrefixes.includes(ownPrefix),
      username: username,
      startPosition: startPosition,
      quantity: quantity,
      modPatterns: modPatterns,
      mode: mode,
    });
  }

  process(
    args: UserRecentPlaysExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<UserRecentPlaysViewParams> {
    const valuePromise: Promise<UserRecentPlaysViewParams> = (async () => {
      let username = args.username;
      let mode = args.mode;
      const initiatorAppUserId = this.getInitiatorAppUserId(ctx);
      if (username === undefined) {
        const targetAppUserId = this.getTargetAppUserId(ctx, {
          canTargetOthersAsNonAdmin: true,
        });
        const appUserInfoResponse = await this.getAppUserInfo.execute({
          id: targetAppUserId,
          server: args.server,
        });
        const boundUser = appUserInfoResponse.userInfo;
        if (boundUser === undefined) {
          return {
            server: args.server,
            mode: args.mode,
            passesOnly: args.passesOnly,
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
            retryWithUsername: username =>
              this.process({...args, username}, ctx),
            recentPlays: undefined,
          };
        }
        username = boundUser.username;
        mode ??= boundUser.ruleset;
      }
      const startPosition = clamp(args.startPosition ?? 1, 1, 100);
      const quantity = clamp(args.quantity ?? 1, 1, 10);
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
      const recentPlaysResult = await this.getRecentPlays.execute({
        initiatorAppUserId: initiatorAppUserId,
        server: args.server,
        username: username,
        ruleset: mode,
        includeFails: !args.passesOnly,
        startPosition: startPosition,
        quantity: quantity,
        modPatterns: modPatterns,
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
              setUsername: undefined,
              retryWithUsername: undefined,
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
        setUsername: undefined,
        retryWithUsername: undefined,
        recentPlays: recentPlays,
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(
    params: UserRecentPlaysViewParams
  ): MaybeDeferred<TOutput> {
    const {
      server,
      mode,
      passesOnly,
      usernameInput,
      setUsername,
      retryWithUsername,
      recentPlays,
    } = params;
    if (recentPlays === undefined) {
      if (usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(
          server,
          setUsername,
          retryWithUsername!
        );
      }
      return this.createUserNotFoundMessage(server, usernameInput);
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
    ) => MaybeDeferred<UserRecentPlaysViewParams>
  ): MaybeDeferred<TOutput>;
  abstract createNoRecentPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset,
    passesOnly: boolean,
    username: string
  ): MaybeDeferred<TOutput>;

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
    if (args.modPatterns !== undefined) {
      tokens.push(MOD_PATTERNS.unparse(args.modPatterns));
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
  username?: string;
  startPosition?: number;
  quantity?: number;
  modPatterns?: ModPatternsArg;
  mode?: OsuRuleset;
};

export type UserRecentPlaysViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  passesOnly: boolean;
  usernameInput: string | undefined;
  setUsername:
    | ((username: string) => Promise<LinkUsernameResult | undefined>)
    | undefined;
  retryWithUsername:
    | ((username?: string) => MaybeDeferred<UserRecentPlaysViewParams>)
    | undefined;
  recentPlays: OsuUserRecentPlays | undefined;
};
