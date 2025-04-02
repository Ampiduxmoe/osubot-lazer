import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuUserBestPlays} from '../../application/usecases/get_user_best_plays/GetUserBestPlaysResponse';
import {GetUserBestPlaysUseCase} from '../../application/usecases/get_user_best_plays/GetUserBestPlaysUseCase';
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
  WORD,
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

export abstract class UserBestPlays<TContext, TOutput> extends TextCommand<
  UserBestPlaysExecutionArgs,
  UserBestPlaysViewParams,
  TContext,
  TOutput
> {
  internalName = UserBestPlays.name;
  shortDescription = 'топ скоры игрока';
  longDescription = 'Отображает лучшие скоры игрока';
  notices = [NOTICE_ABOUT_SPACES_IN_USERNAMES];

  static prefixes = new CommandPrefixes('p', 'pb', 'PersonalBest');
  prefixes = UserBestPlays.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserBestPlays.COMMAND_PREFIX;
  private static WORD_COUNT = WORD('!count');
  private WORD_COUNT = UserBestPlays.WORD_COUNT;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: START_POSITION, isOptional: true},
    {argument: QUANTITY, isOptional: true},
    {argument: MOD_PATTERNS, isOptional: true},
    {argument: MODE, isOptional: true},
    {argument: this.WORD_COUNT, isOptional: true},
  ];

  constructor(
    public textProcessor: TextProcessor,
    protected getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    protected getTargetAppUserId: GetTargetAppUserId<TContext>,
    protected saveLastSeenBeatmapId: SaveLastSeenBeatmapId<TContext>,
    protected getUserBestPlays: GetUserBestPlaysUseCase,
    protected getAppUserInfo: GetAppUserInfoUseCase,
    protected setUsername: SetUsernameUseCase
  ) {
    super(UserBestPlays.commandStructure);
  }

  matchText(text: string): CommandMatchResult<UserBestPlaysExecutionArgs> {
    const fail = CommandMatchResult.fail<UserBestPlaysExecutionArgs>();
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
    const onlyCountRes = argsProcessor.use(this.WORD_COUNT).extractWithToken();

    if (argsProcessor.remainingTokens.length > 0) {
      let extractionResults = [
        [...serverRes, SERVER_PREFIX],
        [...ownPrefixRes, this.COMMAND_PREFIX],
        [...startPositionRes, START_POSITION],
        [...quantityRes, QUANTITY],
        [...modPatternsRes, MOD_PATTERNS],
        [...modeRes, MODE],
        [...usernameRes, USERNAME],
        [...onlyCountRes, this.WORD_COUNT],
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
    const startPosition = startPositionRes[0];
    const quantity = quantityRes[0];
    const modPatterns = modPatternsRes[0];
    const mode = modeRes[0];
    const username = usernameRes[0];
    const onlyCount = onlyCountRes[0] !== undefined;
    return CommandMatchResult.ok({
      server: server,
      username: username,
      startPosition: startPosition,
      quantity: quantity,
      modPatterns: modPatterns,
      mode: mode,
      onlyCount: onlyCount,
    });
  }

  process(
    args: UserBestPlaysExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<UserBestPlaysViewParams> {
    const valuePromise: Promise<UserBestPlaysViewParams> = (async () => {
      let username = args.username;
      let mode = args.mode;
      const onlyCount = args.onlyCount === true;
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
            bestPlays: undefined,
            onlyCount: false,
            modPatterns: args.modPatterns,
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
      if (onlyCount) {
        // override
        quantity = 100;
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
      const bestPlaysResult = await this.getUserBestPlays.execute({
        initiatorAppUserId: initiatorAppUserId,
        server: args.server,
        username: username,
        ruleset: mode,
        startPosition: startPosition,
        quantity: quantity,
        modPatterns: modPatterns,
        calculateDifficulty: !onlyCount,
      });
      if (bestPlaysResult.isFailure) {
        const internalFailureReason = bestPlaysResult.failureReason!;
        switch (internalFailureReason) {
          case 'user not found':
            return {
              server: args.server,
              mode: mode,
              usernameInput: args.username,
              setUsername: undefined,
              retryWithUsername: undefined,
              bestPlays: undefined,
              onlyCount: false,
              modPatterns: args.modPatterns,
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
        setUsername: undefined,
        retryWithUsername: undefined,
        bestPlays: bestPlays,
        onlyCount: onlyCount,
        modPatterns: args.modPatterns,
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(params: UserBestPlaysViewParams): MaybeDeferred<TOutput> {
    const {
      server,
      mode,
      usernameInput,
      setUsername,
      retryWithUsername,
      bestPlays,
      onlyCount,
      modPatterns,
    } = params;
    if (bestPlays === undefined) {
      if (usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(
          server,
          setUsername,
          retryWithUsername!
        );
      }
      return this.createUserNotFoundMessage(server, usernameInput);
    }
    if (bestPlays.plays.length === 0) {
      return this.createNoBestPlaysMessage(server, mode!, bestPlays.username);
    }
    if (onlyCount) {
      return this.createBestPlaysCountMessage(
        server,
        mode!,
        bestPlays.username,
        bestPlays.plays.length,
        modPatterns
      );
    }
    return this.createBestPlaysMessage(bestPlays, server, mode!);
  }

  abstract createBestPlaysMessage(
    bestPlays: OsuUserBestPlays,
    server: OsuServer,
    mode: OsuRuleset
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
    ) => MaybeDeferred<UserBestPlaysViewParams>
  ): MaybeDeferred<TOutput>;
  abstract createNoBestPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset,
    username: string
  ): MaybeDeferred<TOutput>;
  abstract createBestPlaysCountMessage(
    server: OsuServer,
    mode: OsuRuleset,
    username: string,
    count: number,
    modPatterns?: ModPatternsArg
  ): MaybeDeferred<TOutput>;

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
    if (args.onlyCount === true) {
      tokens.push(this.WORD_COUNT.unparse(''));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type UserBestPlaysExecutionArgs = {
  server: OsuServer;
  username?: string;
  startPosition?: number;
  quantity?: number;
  modPatterns?: ModPatternsArg;
  mode?: OsuRuleset;
  onlyCount?: boolean;
};

export type UserBestPlaysViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  usernameInput: string | undefined;
  setUsername:
    | ((username: string) => Promise<LinkUsernameResult | undefined>)
    | undefined;
  retryWithUsername:
    | ((username?: string) => MaybeDeferred<UserBestPlaysViewParams>)
    | undefined;
  bestPlays: OsuUserBestPlays | undefined;
  onlyCount: boolean;
  modPatterns: ModPatternsArg | undefined;
};
