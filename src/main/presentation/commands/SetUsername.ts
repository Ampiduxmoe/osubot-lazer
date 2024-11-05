import {GetAppUserInfoUseCase} from '../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {SetUsernameUseCase} from '../../application/usecases/set_username/SetUsernameUseCase';
import {UnlinkUsernameUseCase} from '../../application/usecases/unlink_username/UnlinkUsernameUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../primitives/OsuRuleset';
import {OsuServer} from '../../primitives/OsuServer';
import {CommandArgument} from '../common/arg_processing/CommandArgument';
import {
  MODE,
  OWN_COMMAND_PREFIX,
  SERVER_PREFIX,
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
import {GetTargetAppUserId} from './common/Signatures';

export abstract class SetUsername<TContext, TOutput> extends TextCommand<
  SetUsernameExecutionArgs,
  SetUsernameViewParams,
  TContext,
  TOutput
> {
  internalName = SetUsername.name;
  shortDescription = 'установить/сбросить ник';
  longDescription =
    'Позволяет привязать новый игровой никнейм к вашему аккаунту ВК или отвязать существующий';
  notices = [NOTICE_ABOUT_SPACES_IN_USERNAMES];

  static prefixes = new CommandPrefixes('n', 'Nickname');
  prefixes = SetUsername.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = SetUsername.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  constructor(
    public textProcessor: TextProcessor,
    protected getTargetAppUserId: GetTargetAppUserId<TContext>,
    protected setUsername: SetUsernameUseCase,
    protected unlinkUsername: UnlinkUsernameUseCase,
    protected getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(SetUsername.commandStructure);
  }

  matchText(text: string): CommandMatchResult<SetUsernameExecutionArgs> {
    const fail = CommandMatchResult.fail<SetUsernameExecutionArgs>();
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
      let extractionResults = [
        [...serverRes, SERVER_PREFIX],
        [...ownPrefixRes, this.COMMAND_PREFIX],
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
    const mode = modeRes[0];
    const username = usernameRes[0];
    return CommandMatchResult.ok({
      server: server,
      username: username,
      mode: mode,
    });
  }

  process(
    args: SetUsernameExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<SetUsernameViewParams> {
    const valuePromise: Promise<SetUsernameViewParams> = (async () => {
      const targetAppUserId = this.getTargetAppUserId(ctx, {
        canTargetOthersAsNonAdmin: false,
      });
      const appUserResult = await this.getAppUserInfo.execute({
        id: targetAppUserId,
        server: args.server,
      });
      const prevUsername = appUserResult.userInfo?.username;
      if (args.username === undefined) {
        return {
          server: args.server,
          usernameInput: undefined,
          previousUsername: prevUsername,
          appUserId: targetAppUserId,
          username: undefined,
          mode: undefined,
        };
      }
      const commandResult = await this.setUsername.execute({
        appUserId: targetAppUserId,
        server: args.server,
        username: args.username,
        mode: args.mode,
      });
      if (commandResult.isFailure) {
        const internalFailureReason = commandResult.failureReason!;
        switch (internalFailureReason) {
          case 'user not found':
            return {
              server: args.server,
              usernameInput: args.username,
              previousUsername: prevUsername,
              appUserId: targetAppUserId,
              username: undefined,
              mode: args.mode,
            };
        }
      }
      return {
        server: args.server,
        usernameInput: args.username,
        previousUsername: prevUsername,
        appUserId: targetAppUserId,
        username: commandResult.username!,
        mode: commandResult.mode!,
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(params: SetUsernameViewParams): MaybeDeferred<TOutput> {
    const {server, usernameInput, previousUsername, appUserId, username, mode} =
      params;
    if (usernameInput === undefined) {
      const unlinkUsername = () =>
        this.unlinkUsername
          .execute({appUserId: appUserId!, server: server})
          .then(res => res.foundAndDeleted);
      return this.createNoArgsMessage(server, previousUsername, unlinkUsername);
    }
    if (username === undefined) {
      return this.createUserNotFoundMessage(server, usernameInput);
    }
    return this.createUsernameSetMessage(server, username, mode!);
  }

  abstract createNoArgsMessage(
    server: OsuServer,
    currentUsername: string | undefined,
    unlinkUsername: () => Promise<boolean>
  ): MaybeDeferred<TOutput>;
  abstract createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): MaybeDeferred<TOutput>;
  abstract createUsernameSetMessage(
    server: OsuServer,
    username: string,
    mode: OsuRuleset
  ): MaybeDeferred<TOutput>;

  unparse(args: SetUsernameExecutionArgs): string {
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

export type SetUsernameExecutionArgs = {
  server: OsuServer;
  username?: string;
  mode?: OsuRuleset;
};

export type SetUsernameViewParams = {
  server: OsuServer;
  usernameInput: string | undefined;
  previousUsername: string | undefined;
  appUserId: string | undefined;
  username: string | undefined;
  mode: OsuRuleset | undefined;
};
