import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuUserBestPlays} from '../../application/usecases/get_user_best_plays/GetUserBestPlaysResponse';
import {GetUserBestPlaysUseCase} from '../../application/usecases/get_user_best_plays/GetUserBestPlaysUseCase';
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
    protected getUserBestPlays: GetUserBestPlaysUseCase,
    protected getAppUserInfo: GetAppUserInfoUseCase
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
    const startPosition = startPositionRes[0];
    const quantity = quantityRes[0];
    const modPatterns = modPatternsRes[0];
    const mode = modeRes[0];
    const username = usernameRes[0];
    return CommandMatchResult.ok({
      server: server,
      username: username,
      startPosition: startPosition,
      quantity: quantity,
      modPatterns: modPatterns,
      mode: mode,
    });
  }

  process(
    args: UserBestPlaysExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<UserBestPlaysViewParams> {
    const valuePromise: Promise<UserBestPlaysViewParams> = (async () => {
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
        initiatorAppUserId: this.getInitiatorAppUserId(ctx),
        server: args.server,
        username: username,
        ruleset: mode,
        startPosition: startPosition,
        quantity: quantity,
        modPatterns: modPatterns,
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
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(params: UserBestPlaysViewParams): MaybeDeferred<TOutput> {
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
  ): MaybeDeferred<TOutput>;
  abstract createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): MaybeDeferred<TOutput>;
  abstract createUsernameNotBoundMessage(
    server: OsuServer
  ): MaybeDeferred<TOutput>;
  abstract createNoBestPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset
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
    return this.textProcessor.detokenize(tokens);
  }
}

export type UserBestPlaysExecutionArgs = {
  server: OsuServer;
  username: string | undefined;
  startPosition: number | undefined;
  quantity: number | undefined;
  modPatterns: ModPatternsArg | undefined;
  mode: OsuRuleset | undefined;
};

export type UserBestPlaysViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  usernameInput: string | undefined;
  bestPlays: OsuUserBestPlays | undefined;
};
