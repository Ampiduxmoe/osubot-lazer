/* eslint-disable no-irregular-whitespace */
import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {NOTICE_ABOUT_SPACES_IN_USERNAMES, VkCommand} from './base/VkCommand';
import {APP_CODE_NAME} from '../../../App';
import {VkIdConverter} from '../VkIdConverter';
import {
  ALIAS_PATTERN,
  ALIAS_TARGET,
  ANY_STRING,
  NUMBER,
  OWN_COMMAND_PREFIX,
  WORD,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {CommandPrefixes} from '../../common/CommandPrefixes';
import {TextProcessor} from '../../common/arg_processing/TextProcessor';
import {AppUserCommandAliases} from '../../data/models/AppUserCommandAliases';
import {AppUserCommandAliasesRepository} from '../../data/repositories/AppUserCommandAliasesRepository';

export class Alias extends VkCommand<AliasExecutionArgs, AliasViewParams> {
  internalName = Alias.name;
  shortDescription = 'управление алиасами';
  longDescription =
    'Позволяет отобразить/добавить/удалить/протестировать ваши личные синонимы для команд бота';
  notice = NOTICE_ABOUT_SPACES_IN_USERNAMES;

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
  private static ALIAS_NUMBER = NUMBER(
    'номер',
    'номер шаблона',
    1,
    this.maximumAliases
  );
  private ALIAS_NUMBER = Alias.ALIAS_NUMBER;
  private static TEST_COMMAND = ANY_STRING(
    'тестовая_строка',
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
    {argument: this.ALIAS_NUMBER, isOptional: false}, // 6

    {argument: this.WORD_TEST, isOptional: false}, // 7
    {argument: this.TEST_COMMAND, isOptional: false}, // 8
  ];

  argGroups = {
    show: [0, 1],
    add: [0, 2, 3, 4],
    delete: [0, 5, 6],
    test: [0, 7, 8],
  };

  textProcessor: TextProcessor;
  userAliases: AppUserCommandAliasesRepository;
  constructor(
    textProcessor: TextProcessor,
    userAliases: AppUserCommandAliasesRepository
  ) {
    super(Alias.commandStructure);
    this.textProcessor = textProcessor;
    this.userAliases = userAliases;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<AliasExecutionArgs> {
    const fail = CommandMatchResult.fail<AliasExecutionArgs>();
    let command: string | undefined = undefined;
    if (ctx.hasMessagePayload && ctx.messagePayload!.target === APP_CODE_NAME) {
      command = ctx.messagePayload!.command;
    } else if (ctx.hasText) {
      command = ctx.text!;
    }
    if (command === undefined) {
      return fail;
    }

    const tokens = this.textProcessor.tokenize(command);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    const executionArgs: AliasExecutionArgs = {vkUserId: ctx.senderId};

    if (argsProcessor.use(this.WORD_SHOW).at(0).extract() !== undefined) {
      executionArgs.show = {};
    } else if (argsProcessor.use(this.WORD_ADD).at(0).extract() !== undefined) {
      const pattern = argsProcessor.use(ALIAS_PATTERN).at(0).extract();
      const target = argsProcessor.use(ALIAS_TARGET).at(0).extract();
      if (pattern === undefined || target === undefined) {
        return fail;
      }
      for (const prefix of this.prefixes) {
        if (pattern.toLowerCase().startsWith(prefix.toLowerCase())) {
          return fail;
        }
      }
      executionArgs.add = {aliasPattern: pattern, aliasTarget: target};
    } else if (
      argsProcessor.use(this.WORD_DELETE).at(0).extract() !== undefined
    ) {
      const aliasNumber = argsProcessor.use(this.ALIAS_NUMBER).at(0).extract();
      if (aliasNumber === undefined) {
        return fail;
      }
      executionArgs.delete = {aliasNumber: aliasNumber};
    } else if (
      argsProcessor.use(this.WORD_TEST).at(0).extract() !== undefined
    ) {
      const testString = argsProcessor.use(this.TEST_COMMAND).at(0).extract();
      if (testString === undefined) {
        return fail;
      }
      executionArgs.test = {testString: testString};
    }

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (ownPrefix === undefined) {
      return fail;
    }
    if (
      (executionArgs.show ||
        executionArgs.add ||
        executionArgs.delete ||
        executionArgs.test) === undefined
    ) {
      return fail;
    }
    return CommandMatchResult.ok(executionArgs);
  }

  async process(args: AliasExecutionArgs): Promise<AliasViewParams> {
    const appUserId = VkIdConverter.vkUserIdToAppUserId(args.vkUserId);
    const userAliases = await this.userAliases.get({
      appUserId: appUserId,
    });
    if (args.show !== undefined) {
      return {
        aliases: (userAliases?.aliases.length ?? 0) === 0 ? null : userAliases!,
      };
    }
    if (args.add !== undefined) {
      if ((userAliases?.aliases.length ?? 0) >= Alias.maximumAliases) {
        return {
          action: 'add',
          actionSuccess: false,
        };
      }
      await this.userAliases.save({
        appUserId: appUserId,
        aliases: [
          ...(userAliases?.aliases ?? []),
          {pattern: args.add.aliasPattern, replacement: args.add.aliasTarget},
        ],
      });
      return {
        action: 'add',
        actionSuccess: true,
      };
    }
    if (args.delete !== undefined) {
      if ((userAliases?.aliases.length ?? 0) === 0) {
        return {
          aliases: null,
        };
      }
      const deleteArgs = args.delete;
      let success = false;
      await this.userAliases.save({
        appUserId: appUserId,
        aliases: [
          ...(userAliases?.aliases.filter((_v, i) => {
            if (i + 1 === deleteArgs.aliasNumber) {
              success = true;
              return false;
            }
            return true;
          }) ?? []),
        ],
      });
      return {
        action: 'delete',
        actionSuccess: success,
      };
    }
    if (args.test !== undefined) {
      return {
        testResult: 'WIP',
      };
    }
    throw Error('Unknown Alias command execution path');
  }

  createOutputMessage(params: AliasViewParams): VkOutputMessage {
    const {aliases, action, actionSuccess, testResult} = params;
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
    throw Error('Unknown Alias command output path');
  }

  createAliasesMessage(userAliases: AppUserCommandAliases): VkOutputMessage {
    const text = userAliases.aliases
      .map(
        (v, i) => `${i + 1}. Шаблон: ${v.pattern}\n　 Замена: ${v.replacement}`
      )
      .join('\n');
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createNoAliasesMessage(): VkOutputMessage {
    const text = `
У вас отсутствуют шаблоны!
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createAliasAddResultMessage(success: boolean): VkOutputMessage {
    const text = success
      ? 'Шаблон успешно добавлен'
      : 'Не удалось добавить шаблон\nДостигнуто максимальное количество шаблонов';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createAliasDeleteResultMessage(success: boolean) {
    const text = success
      ? 'Шаблон успешно удален'
      : 'Не удалось удалить шаблон\nШаблон с заданным номером не найден';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createTestResultMessage(result: string) {
    const text = result;
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

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
        this.ALIAS_NUMBER.unparse(args.delete.aliasNumber)
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

type AliasExecutionArgs = {
  vkUserId: number;
  show?: ShowArgs;
  add?: AddArgs;
  delete?: DeleteArgs;
  test?: TestArgs;
};

type ShowArgs = {};
type AddArgs = {
  aliasPattern: string;
  aliasTarget: string;
};
type DeleteArgs = {
  aliasNumber: number;
};
type TestArgs = {
  testString: string;
};

type AliasViewParams = {
  aliases?: AppUserCommandAliases | null;
  action?: 'add' | 'delete';
  actionSuccess?: boolean;
  testResult?: string;
};
