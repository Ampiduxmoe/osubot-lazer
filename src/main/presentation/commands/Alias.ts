import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {ALL_OSU_SERVER_VALUES, OsuServer} from '../../primitives/OsuServer';
import {
  CommandMatchResult,
  TokenMatchEntry,
} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {AliasProcessor} from '../common/alias_processing/AliasProcessor';
import {
  ALIAS_PATTERN,
  ALIAS_TARGET,
  ANY_STRING,
  MULTIPLE_INTEGERS_OR_RANGES,
  OWN_COMMAND_PREFIX,
  SERVER_PREFIX,
  WORD,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {AppUserCommandAliases} from '../data/models/AppUserCommandAliases';
import {AppUserCommandAliasesRepository} from '../data/repositories/AppUserCommandAliasesRepository';
import {BeatmapInfo} from './BeatmapInfo';
import {ChatLeaderboard} from './ChatLeaderboard';
import {ChatLeaderboardOnMap} from './ChatLeaderboardOnMap';
import {SetUsername} from './SetUsername';
import {UserBestPlays} from './UserBestPlays';
import {UserBestPlaysOnMap} from './UserBestPlaysOnMap';
import {UserInfo} from './UserInfo';
import {UserRecentPlays} from './UserRecentPlays';
import {TextCommand} from './base/TextCommand';
import {GetTargetAppUserId} from './common/Signatures';

export abstract class Alias<TContext, TOutput> extends TextCommand<
  AliasExecutionArgs,
  AliasViewParams,
  TContext,
  TOutput
> {
  internalName = Alias.name;
  shortDescription = 'управление алиасами';
  longDescription =
    'Позволяет отобразить/добавить/удалить/протестировать ваши личные синонимы для команд бота';
  notices = [];

  static readonly maximumAliases: number = 20;

  static prefixes = new CommandPrefixes('osubot-alias');
  prefixes = Alias.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = Alias.COMMAND_PREFIX;
  private static WORD_SHOW = WORD('show');
  private WORD_SHOW = Alias.WORD_SHOW;
  private static WORD_ADD = WORD('add');
  private WORD_ADD = Alias.WORD_ADD;
  private static WORD_DELETE = WORD('delete');
  private WORD_DELETE = Alias.WORD_DELETE;
  private static WORD_TEST = WORD('test');
  private WORD_TEST = Alias.WORD_TEST;
  private static WORD_LEGACY = WORD('legacy');
  private WORD_LEGACY = Alias.WORD_LEGACY;
  private static ALIAS_NUMBERS = MULTIPLE_INTEGERS_OR_RANGES(
    'номер',
    'номер шаблона',
    'номер шаблона или интервал в формате x-y',
    1,
    this.maximumAliases
  );
  private ALIAS_NUMBERS = Alias.ALIAS_NUMBERS;
  private static TEST_COMMAND = ANY_STRING(
    'тестовая_строка',
    'тестовая строка',
    'строка, проверяющая работу вашего шаблона'
  );
  private TEST_COMMAND = Alias.TEST_COMMAND;

  private static commandStructure = [
    {argument: this.COMMAND_PREFIX, isOptional: false}, // 0

    {argument: this.WORD_SHOW, isOptional: false}, // 1

    {argument: this.WORD_ADD, isOptional: false}, // 2
    {argument: ALIAS_PATTERN, isOptional: false}, // 3
    {argument: ALIAS_TARGET, isOptional: false}, // 4

    {argument: this.WORD_DELETE, isOptional: false}, // 5
    {argument: this.ALIAS_NUMBERS, isOptional: false}, // 6

    {argument: this.WORD_TEST, isOptional: false}, // 7
    {argument: this.TEST_COMMAND, isOptional: false}, // 8

    {argument: this.WORD_LEGACY, isOptional: false}, // 9
  ];

  argGroups = {
    show: {
      isCompeting: true,
      description: 'Показывает ваши шаблоны',
      notices: [],
      memberIndices: [0, 1],
    },
    add: {
      isCompeting: true,
      description: 'Добавляет шаблон',
      notices: [
        'ЕСЛИ ВЫ ДОБАВЛЯЕТЕ АЛИАС В КОТОРОМ ПАТТЕРН/ЗАМЕНА СОДЕРЖИТ ПРОБЕЛЫ, ОБЕРНИТЕ ПАТТЕРН/ЗАМЕНУ В \'ОДИНАРНЫЕ\', "ДВОЙНЫЕ" ИЛИ `ВОТ ТАКИЕ` КАВЫЧКИ',
        'Наглядные примеры:\n' +
          // eslint-disable-next-line no-irregular-whitespace
          `1. Вы ввели «${this.prefixes[0]} add SCORE* 'l r "worst hr player" -osu'»:\n` +
          'В данном случае бот отреагирует как на «SCORE», так и на «SCORE +dt»\n' +
          // eslint-disable-next-line no-irregular-whitespace
          `2. Вы ввели «${this.prefixes[0]} add SCORE 'l r "worst hr player" -osu'»:\n` +
          'В данном случае бот будет отвечать только на «SCORE»',
      ],
      memberIndices: [0, 2, 3, 4],
    },
    delete: {
      isCompeting: true,
      description: 'Удаляет шаблон',
      notices: [],
      memberIndices: [0, 5, 6],
    },
    test: {
      isCompeting: true,
      description:
        'Позволяет протестировать свои шаблоны; ' +
        'используйте эту команду, для того чтобы увидеть, ' +
        'как сообщение изменяется с помощью ваших шаблонов',
      notices: [],
      memberIndices: [0, 7, 8],
    },
    legacy: {
      isCompeting: true,
      description:
        'Заменяет все ваши шаблоны на те, ' +
        'что позволяют использовать старые сокращения команд',
      notices: [],
      memberIndices: [0, 9],
    },
  };

  constructor(
    public textProcessor: TextProcessor,
    protected getTargetAppUserId: GetTargetAppUserId<TContext>,
    protected aliases: AppUserCommandAliasesRepository,
    protected aliasProcessor: AliasProcessor
  ) {
    super(Alias.commandStructure);
  }

  matchText(text: string): CommandMatchResult<AliasExecutionArgs> {
    const fail = CommandMatchResult.fail<AliasExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    if (argsProcessor.use(this.COMMAND_PREFIX).at(0).extract() === undefined) {
      return fail;
    }
    const executionArgs: AliasExecutionArgs = {};
    let tokenMapping: TokenMatchEntry[] = [];

    if (argsProcessor.use(this.WORD_SHOW).at(0).extract() !== undefined) {
      tokenMapping = [
        {token: tokens[0], argument: this.COMMAND_PREFIX},
        {token: tokens[1], argument: this.WORD_SHOW},
        ...tokens.slice(2).map(token => ({token: token, argument: undefined})),
      ];
      executionArgs.show = {};
    } else if (argsProcessor.use(this.WORD_ADD).at(0).extract() !== undefined) {
      const pattern = argsProcessor.use(ALIAS_PATTERN).at(0).extract();
      const target = argsProcessor.use(ALIAS_TARGET).at(0).extract();
      tokenMapping = [
        {token: tokens[0], argument: this.COMMAND_PREFIX},
        {token: tokens[1], argument: this.WORD_ADD},
        ...(pattern !== undefined
          ? [{token: tokens[2], argument: ALIAS_PATTERN}]
          : []),
        ...(target !== undefined
          ? [{token: tokens[3], argument: ALIAS_TARGET}]
          : []),
        ...tokens.slice(4).map(token => ({token: token, argument: undefined})),
      ];
      if (pattern === undefined || target === undefined) {
        return CommandMatchResult.partial(tokenMapping);
      }
      for (const prefix of this.prefixes) {
        // Try to prevent users from shooting themselves in the foot.
        // The idea there is if you can delete your first alias,
        // you can delete all of them one by one.
        if (this.aliasProcessor.match(`${prefix} delete 1`, pattern)) {
          return fail;
        }
      }
      executionArgs.add = {aliasPattern: pattern, aliasTarget: target};
    } else if (
      argsProcessor.use(this.WORD_DELETE).at(0).extract() !== undefined
    ) {
      const ranges = argsProcessor.use(this.ALIAS_NUMBERS).at(0).extract();
      tokenMapping = [
        {token: tokens[0], argument: this.COMMAND_PREFIX},
        {token: tokens[1], argument: this.WORD_DELETE},
        ...(ranges !== undefined
          ? [{token: tokens[2], argument: this.ALIAS_NUMBERS}]
          : []),
        ...tokens.slice(3).map(token => ({token: token, argument: undefined})),
      ];
      if (ranges === undefined) {
        return CommandMatchResult.partial(tokenMapping);
      }
      executionArgs.delete = ranges.map(([deleteStart, deleteEnd]) => ({
        deleteStart,
        deleteEnd,
      }));
    } else if (
      argsProcessor.use(this.WORD_TEST).at(0).extract() !== undefined
    ) {
      const testString = argsProcessor.use(this.TEST_COMMAND).at(0).extract();
      tokenMapping = [
        {token: tokens[0], argument: this.COMMAND_PREFIX},
        {token: tokens[1], argument: this.WORD_TEST},
        ...(testString !== undefined
          ? [{token: tokens[2], argument: this.TEST_COMMAND}]
          : []),
        ...tokens.slice(3).map(token => ({token: token, argument: undefined})),
      ];
      if (testString === undefined) {
        return CommandMatchResult.partial(tokenMapping);
      }
      executionArgs.test = {testString: testString};
    } else if (
      argsProcessor.use(this.WORD_LEGACY).at(0).extract() !== undefined
    ) {
      tokenMapping = [
        {token: tokens[0], argument: this.COMMAND_PREFIX},
        {token: tokens[1], argument: this.WORD_LEGACY},
        ...tokens.slice(2).map(token => ({token: token, argument: undefined})),
      ];
      executionArgs.legacy = {};
    } else {
      tokenMapping = [
        {token: tokens[0], argument: this.COMMAND_PREFIX},
        ...tokens.slice(1).map(token => ({token: token, argument: undefined})),
      ];
      return CommandMatchResult.partial(tokenMapping);
    }

    if (argsProcessor.remainingTokens.length > 0) {
      return CommandMatchResult.partial(tokenMapping);
    }
    if (
      (executionArgs.show ??
        executionArgs.add ??
        executionArgs.delete ??
        executionArgs.test ??
        executionArgs.legacy) === undefined
    ) {
      return CommandMatchResult.partial(tokenMapping);
    }
    return CommandMatchResult.ok(executionArgs);
  }

  process(
    args: AliasExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<AliasViewParams> {
    const valuePromise: Promise<AliasViewParams> = (async () => {
      if (args.show !== undefined) {
        const userAliases = await this.aliases.get({
          appUserId: this.getTargetAppUserId(ctx, {
            canTargetOthersAsNonAdmin: true,
          }),
        });
        return {
          aliases:
            (userAliases?.aliases.length ?? 0) === 0 ? null : userAliases!,
        };
      }
      const appUserId = this.getTargetAppUserId(ctx, {
        canTargetOthersAsNonAdmin: false,
      });
      const userAliases = await this.aliases.get({
        appUserId: appUserId,
      });
      if (args.add !== undefined) {
        if ((userAliases?.aliases.length ?? 0) >= Alias.maximumAliases) {
          return {
            action: 'add',
            actionCount: 0,
          };
        }
        await this.aliases.save({
          appUserId: appUserId,
          aliases: [
            ...(userAliases?.aliases ?? []),
            {pattern: args.add.aliasPattern, replacement: args.add.aliasTarget},
          ],
        });
        return {
          action: 'add',
          actionCount: 1,
        };
      }
      if (args.delete !== undefined) {
        if ((userAliases?.aliases.length ?? 0) === 0) {
          return {
            aliases: null,
          };
        }
        const deleteArgs = args.delete;
        let actionCount = 0;
        await this.aliases.save({
          appUserId: appUserId,
          aliases: [
            ...(userAliases?.aliases.filter((_, i) => {
              const aliasNumber = i + 1;
              for (const range of deleteArgs) {
                if (
                  aliasNumber >= range.deleteStart &&
                  aliasNumber <= range.deleteEnd
                ) {
                  actionCount += 1;
                  return false;
                }
              }
              return true;
            }) ?? []),
          ],
        });
        return {
          action: 'delete',
          actionCount: actionCount,
        };
      }
      if (args.test !== undefined) {
        let matchingAlias:
          | {
              pattern: string;
              replacement: string;
            }
          | undefined = undefined;
        for (const alias of userAliases?.aliases ?? []) {
          if (this.aliasProcessor.match(args.test.testString, alias.pattern)) {
            if (alias.pattern.length > (matchingAlias?.pattern.length ?? 0)) {
              matchingAlias = alias;
            }
          }
        }
        if (matchingAlias === undefined) {
          return {
            testResult: 'Не найдено подходящего шаблона!',
          };
        }
        return {
          testResult: this.aliasProcessor.process(
            args.test.testString,
            matchingAlias.pattern,
            matchingAlias.replacement
          ),
        };
      }
      if (args.legacy !== undefined) {
        const oldServerPrefixes = {
          [OsuServer.Bancho]: 's',
        };
        const oldPrefixes = {
          nickname: 'n',
          user: 'u',
          recent: 'r',
          personalBest: 't',
          mapPersonalBest: 'c',
          leaderboard: 'chat',
          mapLeaderboard: 'lb',
        };
        const newAliases: AppUserCommandAliases = {
          appUserId: appUserId,
          aliases: [],
        };
        const aliasIfNeeded = (
          oldPrefix: string,
          newPrefixes: CommandPrefixes
        ): void => {
          if (!newPrefixes.matchIgnoringCase(oldPrefix)) {
            const legacyCommandPrefixArg = OWN_COMMAND_PREFIX(
              new CommandPrefixes(oldPrefix)
            ).unparse(oldPrefix);
            const currentCommandPrefixArg = OWN_COMMAND_PREFIX(
              SetUsername.prefixes
            ).unparse(newPrefixes[0]);
            for (const server of ALL_OSU_SERVER_VALUES) {
              const currentServerArg = SERVER_PREFIX.unparse(server);
              const legacyServerArg =
                oldServerPrefixes[server] ?? currentServerArg;
              const pattern = `${legacyServerArg} ${legacyCommandPrefixArg}*`;
              const replacement = `${currentServerArg} ${currentCommandPrefixArg}`;
              newAliases.aliases.push({
                pattern: pattern,
                replacement: replacement,
              });
            }
          }
        };
        aliasIfNeeded(oldPrefixes.nickname, SetUsername.prefixes);
        aliasIfNeeded(oldPrefixes.user, UserInfo.prefixes);
        aliasIfNeeded(oldPrefixes.recent, UserRecentPlays.prefixes);
        aliasIfNeeded(oldPrefixes.personalBest, UserBestPlays.prefixes);
        aliasIfNeeded(oldPrefixes.mapPersonalBest, UserBestPlaysOnMap.prefixes);
        aliasIfNeeded(oldPrefixes.leaderboard, ChatLeaderboard.prefixes);
        aliasIfNeeded(
          oldPrefixes.mapLeaderboard,
          ChatLeaderboardOnMap.prefixes
        );
        // special case for map because old version was not prefixed
        (() => {
          const serverArg = SERVER_PREFIX.unparse(OsuServer.Bancho);
          const newPrefixArg = OWN_COMMAND_PREFIX(BeatmapInfo.prefixes).unparse(
            BeatmapInfo.prefixes[0]
          );
          const pattern = 'map*';
          const replacement = `${serverArg} ${newPrefixArg}`;
          newAliases.aliases.push({
            pattern: pattern,
            replacement: replacement,
          });
        })();
        await this.aliases.save(newAliases);
        return {
          action: 'add',
          actionCount: newAliases.aliases.length,
        };
      }
      throw Error(`Unknown ${this.internalName} command execution path`);
    })();
    return MaybeDeferred.fromInstantPromise(valuePromise);
  }

  createOutputMessage(params: AliasViewParams): MaybeDeferred<TOutput> {
    const {aliases, action, actionCount: actionSuccess, testResult} = params;
    if (aliases !== undefined) {
      if (aliases === null) {
        return this.createNoAliasesMessage();
      }
      return this.createAliasesMessage(aliases);
    }
    if (action !== undefined) {
      if (action === 'add') {
        return this.createAliasAddResultMessage(actionSuccess!);
      }
      if (action === 'delete') {
        return this.createAliasDeleteResultMessage(actionSuccess!);
      }
    }
    if (testResult !== undefined) {
      return this.createTestResultMessage(testResult);
    }
    throw Error(`Unknown ${this.internalName} command output path`);
  }

  abstract createAliasesMessage(
    userAliases: AppUserCommandAliases
  ): MaybeDeferred<TOutput>;
  abstract createNoAliasesMessage(): MaybeDeferred<TOutput>;
  abstract createAliasAddResultMessage(
    actionCount: number
  ): MaybeDeferred<TOutput>;
  abstract createAliasDeleteResultMessage(
    actionCount: number
  ): MaybeDeferred<TOutput>;
  abstract createTestResultMessage(result: string): MaybeDeferred<TOutput>;

  unparse(args: AliasExecutionArgs): string {
    const tokens = [this.COMMAND_PREFIX.unparse(this.prefixes[0])];
    if (args.show !== undefined) {
      tokens.push(this.WORD_SHOW.unparse(''));
    } else if (args.add !== undefined) {
      tokens.push(
        this.WORD_ADD.unparse(''),
        ALIAS_PATTERN.unparse(args.add.aliasPattern),
        ALIAS_TARGET.unparse(args.add.aliasTarget)
      );
    } else if (args.delete !== undefined) {
      tokens.push(
        this.WORD_DELETE.unparse(''),
        this.ALIAS_NUMBERS.unparse(
          args.delete.map(({deleteStart, deleteEnd}) => [
            deleteStart,
            deleteEnd,
          ])
        )
      );
    } else if (args.test !== undefined) {
      tokens.push(
        this.WORD_TEST.unparse(''),
        this.TEST_COMMAND.unparse(args.test.testString)
      );
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type AliasExecutionArgs = {
  show?: ShowArgs;
  add?: AddArgs;
  delete?: DeleteArgs;
  test?: TestArgs;
  legacy?: LegacyArgs;
};

type ShowArgs = {};
type AddArgs = {
  aliasPattern: string;
  aliasTarget: string;
};
type DeleteArgs = {
  deleteStart: number;
  deleteEnd: number;
}[];
type TestArgs = {
  testString: string;
};
type LegacyArgs = {};

export type AliasViewParams = {
  aliases?: AppUserCommandAliases | null;
  action?: 'add' | 'delete';
  actionCount?: number;
  testResult?: string;
};
