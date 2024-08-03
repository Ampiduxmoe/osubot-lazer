import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {OsuUserUpdateInfo} from '../../application/usecases/get_osu_user_update/GetOsuUserUpdateResponse';
import {GetOsuUserUpdateUseCase} from '../../application/usecases/get_osu_user_update/GetOsuUserUpdateUseCase';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
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

export abstract class UserUpdate<TContext, TOutput> extends TextCommand<
  UserUpdateExecutionArgs,
  UserUpdateViewParams,
  TContext,
  TOutput
> {
  internalName = UserUpdate.name;
  shortDescription = 'обновить стату игрока';
  longDescription =
    'Показывает изменения ранга, пп, плейкаунта и топ скоров с момента последнего апдейта';
  notice = NOTICE_ABOUT_SPACES_IN_USERNAMES;

  static prefixes = new CommandPrefixes('update');
  prefixes = UserUpdate.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserUpdate.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  textProcessor: TextProcessor;
  getInitiatorAppUserId: GetInitiatorAppUserId<TContext>;
  getTargetAppUserId: GetTargetAppUserId<TContext>;
  getOsuUserUpdate: GetOsuUserUpdateUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    textProcessor: TextProcessor,
    getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    getTargetAppUserId: GetTargetAppUserId<TContext>,
    getOsuUserUpdate: GetOsuUserUpdateUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(UserUpdate.commandStructure);
    this.textProcessor = textProcessor;
    this.getInitiatorAppUserId = getInitiatorAppUserId;
    this.getTargetAppUserId = getTargetAppUserId;
    this.getOsuUserUpdate = getOsuUserUpdate;
    this.getAppUserInfo = getAppUserInfo;
  }

  matchText(text: string): CommandMatchResult<UserUpdateExecutionArgs> {
    const fail = CommandMatchResult.fail<UserUpdateExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    const mode = argsProcessor.use(MODE).extract();
    const username = argsProcessor.use(USERNAME).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (server === undefined || ownPrefix === undefined) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: server,
      username: username,
      mode: mode,
    });
  }

  async process(
    args: UserUpdateExecutionArgs,
    ctx: TContext
  ): Promise<UserUpdateViewParams> {
    if (args.server !== OsuServer.Bancho) {
      return {
        failure: {
          reason: 'usupported server',
          serverInput: args.server,
          usernameInput: args.username,
          username: undefined,
        },
      };
    }
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
          failure: {
            reason: 'username not bound',
            serverInput: args.server,
            usernameInput: undefined,
            username: undefined,
          },
        };
      }
      username = boundUser.username;
      mode ??= boundUser.ruleset;
    }
    const userUpdateResponse = await this.getOsuUserUpdate.execute({
      initiatorAppUserId: this.getInitiatorAppUserId(ctx),
      username: username,
      mode: mode,
    });
    const userUpdate = userUpdateResponse.userUpdateInfo;
    if (userUpdate === undefined) {
      return {
        failure: {
          reason: 'user not found',
          serverInput: args.server,
          usernameInput: args.username,
          username: username,
        },
      };
    }
    return {
      success: {
        server: args.server,
        mode: userUpdate.mode,
        userUpdate: userUpdate,
      },
    };
  }

  createOutputMessage(params: UserUpdateViewParams): Promise<TOutput> {
    const {success, failure} = params;
    if (failure !== undefined) {
      switch (failure.reason) {
        case 'username not bound':
          return this.createUsernameNotBoundMessage(failure.serverInput);
        case 'user not found':
          return this.createUserNotFoundMessage(
            failure.serverInput,
            failure.usernameInput!
          );
        case 'usupported server':
          return this.createUnsupportedServerMessage(failure.serverInput);
      }
    }
    if (success !== undefined) {
      return this.createUserUpdateMessage(
        success.server,
        success.mode,
        success.userUpdate
      );
    }
    throw Error(`Unknown ${this.internalName} command output path`);
  }

  abstract createUserUpdateMessage(
    server: OsuServer,
    mode: OsuRuleset,
    userUpdate: OsuUserUpdateInfo
  ): Promise<TOutput>;
  abstract createUnsupportedServerMessage(server: OsuServer): Promise<TOutput>;
  abstract createUserNotFoundMessage(
    server: OsuServer,
    username: string
  ): Promise<TOutput>;
  abstract createUsernameNotBoundMessage(server: OsuServer): Promise<TOutput>;

  unparse(args: UserUpdateExecutionArgs): string {
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

export type UserUpdateExecutionArgs = {
  server: OsuServer;
  username: string | undefined;
  mode: OsuRuleset | undefined;
};

export type UserUpdateViewParams = {
  success?: {
    server: OsuServer;
    mode: OsuRuleset;
    userUpdate: OsuUserUpdateInfo;
  };
  failure?: {
    reason: 'username not bound' | 'user not found' | 'usupported server';
    serverInput: OsuServer;
    usernameInput: string | undefined;
    username: string | undefined;
  };
};
