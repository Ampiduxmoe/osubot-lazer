import {SetUsernameUseCase} from '../../application/usecases/set_username/SetUsernameUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
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
import {GetTargetAppUserId} from './common/Signatures';

export abstract class SetUsername<TContext, TOutput> extends TextCommand<
  SetUsernameExecutionArgs,
  SetUsernameViewParams,
  TContext,
  TOutput
> {
  internalName = SetUsername.name;
  shortDescription = 'установить ник';
  longDescription = 'Привязывает игровой никнейм к вашему аккаунту ВК';
  notices = [NOTICE_ABOUT_SPACES_IN_USERNAMES];

  static prefixes = new CommandPrefixes('n', 'Nickname');
  prefixes = SetUsername.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = SetUsername.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: false},
    {argument: MODE, isOptional: true},
  ];

  constructor(
    public textProcessor: TextProcessor,
    protected getTargetAppUserId: GetTargetAppUserId<TContext>,
    protected setUsername: SetUsernameUseCase
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
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    if (server === undefined || ownPrefix === undefined) {
      return fail;
    }
    const mode = argsProcessor.use(MODE).extract();
    const username = argsProcessor.use(USERNAME).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
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
      if (args.username === undefined) {
        return {
          server: args.server,
          usernameInput: undefined,
          username: undefined,
          mode: args.mode,
        };
      }
      const result = await this.setUsername.execute({
        appUserId: this.getTargetAppUserId(ctx, {
          canTargetOthersAsNonAdmin: false,
        }),
        server: args.server,
        username: args.username,
        mode: args.mode,
      });
      if (result.isFailure) {
        const internalFailureReason = result.failureReason!;
        switch (internalFailureReason) {
          case 'user not found':
            return {
              server: args.server,
              usernameInput: args.username,
              username: undefined,
              mode: args.mode,
            };
        }
      }
      return {
        server: args.server,
        usernameInput: args.username,
        username: result.username!,
        mode: result.mode!,
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(params: SetUsernameViewParams): MaybeDeferred<TOutput> {
    const {server, usernameInput, username, mode} = params;
    if (username === undefined) {
      if (usernameInput === undefined) {
        return this.createUsernameNotSpecifiedMessage(server);
      }
      return this.createUserNotFoundMessage(server, usernameInput);
    }
    return this.createUsernameSetMessage(server, username, mode!);
  }

  abstract createUsernameNotSpecifiedMessage(
    server: OsuServer
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
  username: string | undefined;
  mode: OsuRuleset | undefined;
};

export type SetUsernameViewParams = {
  server: OsuServer;
  usernameInput: string | undefined;
  username: string | undefined;
  mode: OsuRuleset | undefined;
};
