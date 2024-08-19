import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {GetOsuUserInfoUseCase} from '../../application/usecases/get_osu_user_info/GetOsuUserInfoUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {Timespan} from '../../primitives/Timespan';
import {CommandArgument} from '../common/arg_processing/CommandArgument';
import {
  MODE,
  OWN_COMMAND_PREFIX,
  SERVER_PREFIX,
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
import {GetInitiatorAppUserId, GetTargetAppUserId} from './common/Signatures';

export abstract class UserInfo<TContext, TOutput> extends TextCommand<
  UserInfoExecutionArgs,
  UserInfoViewParams,
  TContext,
  TOutput
> {
  internalName = UserInfo.name;
  shortDescription = 'статы игрока';
  longDescription = 'Отображает основную информацию об игроке';
  notices = [NOTICE_ABOUT_SPACES_IN_USERNAMES];

  static prefixes = new CommandPrefixes('u', 'User');
  prefixes = UserInfo.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserInfo.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  constructor(
    public textProcessor: TextProcessor,
    protected getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    protected getTargetAppUserId: GetTargetAppUserId<TContext>,
    protected getOsuUserInfo: GetOsuUserInfoUseCase,
    protected getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(UserInfo.commandStructure);
  }

  matchText(text: string): CommandMatchResult<UserInfoExecutionArgs> {
    const fail = CommandMatchResult.fail<UserInfoExecutionArgs>();
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
    const modeRes = argsProcessor.use(MODE).extractWithToken();
    const usernameRes = argsProcessor.use(USERNAME).extractWithToken();

    if (argsProcessor.remainingTokens.length > 0) {
      const extractionResults = [
        [...serverRes, SERVER_PREFIX],
        [...ownPrefixRes, this.COMMAND_PREFIX],
        [...modeRes, MODE],
        [...usernameRes, USERNAME],
      ];
      const mapping: Record<string, CommandArgument<unknown> | undefined> = {};
      for (const originalToken of tokens) {
        const extractionResult = extractionResults.find(
          r => r[1] === originalToken
        );
        if (extractionResult === undefined) {
          mapping[originalToken] = undefined;
          continue;
        }
        mapping[originalToken] =
          extractionResult[2] as CommandArgument<unknown>;
      }
      return CommandMatchResult.partial(mapping);
    }
    const server = serverRes[0];
    const mode = modeRes[0];
    const username = usernameRes[0];
    return CommandMatchResult.ok({
      server: server,
      username: username,
      mode: mode,
    });
  }

  process(
    args: UserInfoExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<UserInfoViewParams> {
    const valuePromise: Promise<UserInfoViewParams> = (async () => {
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
            userInfo: undefined,
          };
        }
        username = boundUser.username;
        mode ??= boundUser.ruleset;
      }
      const userInfoResponse = await this.getOsuUserInfo.execute({
        initiatorAppUserId: this.getInitiatorAppUserId(ctx),
        server: args.server,
        username: username,
        ruleset: mode,
      });
      const userInfo = userInfoResponse.userInfo;
      if (userInfo === undefined) {
        return {
          server: args.server,
          mode: args.mode,
          usernameInput: args.username,
          userInfo: undefined,
        };
      }
      let maybeRankGlobalHighest = userInfo.rankGlobalHighest;
      let rankHighestDateInLocalFormat: string | undefined = undefined;
      if (userInfo.rankGlobalHighestDate !== undefined) {
        const date = new Date(userInfo.rankGlobalHighestDate);
        const now = Date.now();
        const threeMonthsMillis = new Timespan().addDays(90).totalMiliseconds();
        if (
          now - date.getTime() < threeMonthsMillis ||
          userInfo.rankGlobal === maybeRankGlobalHighest
        ) {
          maybeRankGlobalHighest = undefined;
        } else {
          const day = date.getUTCDate();
          const dayFormatted = (day > 9 ? '' : '0') + day;
          const month = date.getUTCMonth() + 1;
          const monthFormatted = (month > 9 ? '' : '0') + month;
          const year = date.getUTCFullYear();
          rankHighestDateInLocalFormat = `${dayFormatted}.${monthFormatted}.${year}`;
        }
      }
      const playtime = new Timespan().addSeconds(userInfo.playtimeSeconds);
      return {
        server: args.server,
        mode: mode ?? userInfo.preferredMode,
        usernameInput: args.username,
        userInfo: {
          username: userInfo.username,
          rankGlobal: userInfo.rankGlobal,
          rankGlobalHighest: maybeRankGlobalHighest,
          rankGlobalHighestDate: rankHighestDateInLocalFormat,
          countryCode: userInfo.countryCode,
          rankCountry: userInfo.rankCountry,
          playcount: userInfo.playcount,
          lvl: userInfo.level,
          playtimeDays: playtime.days,
          playtimeHours: playtime.hours,
          playtimeMinutes: playtime.minutes,
          pp: userInfo.pp,
          accuracy: userInfo.accuracy,
          userId: userInfo.userId,
        },
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(params: UserInfoViewParams): MaybeDeferred<TOutput> {
    const {server, mode, usernameInput, userInfo} = params;
    if (userInfo === undefined) {
      if (usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(server);
      }
      return this.createUserNotFoundMessage(server, usernameInput);
    }
    return this.createUserInfoMessage(server, mode!, userInfo);
  }

  abstract createUserInfoMessage(
    server: OsuServer,
    mode: OsuRuleset,
    userInfo: OsuUserInfo
  ): MaybeDeferred<TOutput>;
  abstract createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): MaybeDeferred<TOutput>;
  abstract createUsernameNotBoundMessage(
    server: OsuServer
  ): MaybeDeferred<TOutput>;

  unparse(args: UserInfoExecutionArgs): string {
    const tokens = [
      SERVER_PREFIX.unparse(args.server),
      this.COMMAND_PREFIX.unparse(this.prefixes[0]),
    ];
    if (args.username !== undefined) {
      tokens.push(USERNAME.unparse(args.username));
    }
    if (args.mode !== undefined) {
      tokens.push(MODE.unparse(args.mode));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type UserInfoExecutionArgs = {
  server: OsuServer;
  username: string | undefined;
  mode: OsuRuleset | undefined;
};

export type UserInfoViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  usernameInput: string | undefined;
  userInfo: OsuUserInfo | undefined;
};

export type OsuUserInfo = {
  username: string;
  rankGlobal: number | null;
  rankGlobalHighest: number | undefined;
  rankGlobalHighestDate: string | undefined;
  countryCode: string;
  rankCountry: number | null;
  playcount: number;
  lvl: number;
  playtimeDays: number;
  playtimeHours: number;
  playtimeMinutes: number;
  pp: number;
  accuracy: number;
  userId: number;
};
