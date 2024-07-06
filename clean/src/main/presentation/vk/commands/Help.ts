import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {APP_CODE_NAME} from '../../../App';
import {
  VK_FOREIGN_COMMAND_PREFIX,
  OWN_COMMAND_PREFIX,
  ANY_STRING,
} from '../../common/arg_processing/CommandArguments';
import {pickRandom} from '../../../../primitives/Arrays';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {CommandPrefixes} from '../../common/CommandPrefixes';
import {CommandArgument} from '../../common/arg_processing/CommandArgument';
import {TextProcessor} from '../../common/arg_processing/TextProcessor';

export class Help extends VkCommand<HelpExecutionArgs, HelpViewParams> {
  internalName = Help.name;
  shortDescription = 'информация о командах';
  longDescription = 'Отображает информацию о доступных командах';
  notice = undefined;

  static prefixes = new CommandPrefixes('osubot', 'osubot-help');
  prefixes = Help.prefixes;

  private COMMAND_PREFIX: CommandArgument<string>;
  private FOREIGN_COMMAND_PREFIX: CommandArgument<string>;
  private USAGE_VARIANT: CommandArgument<string>;

  textProcessor: TextProcessor;
  commands: VkCommand<unknown, unknown>[];
  constructor(
    textProcessor: TextProcessor,
    commands: VkCommand<unknown, unknown>[]
  ) {
    const COMMAND_PREFIX = OWN_COMMAND_PREFIX(Help.prefixes);
    const FOREIGN_COMMAND_PREFIX = VK_FOREIGN_COMMAND_PREFIX(
      new CommandPrefixes(
        ...Help.prefixes,
        ...commands.map(c => c.prefixes).flat(1)
      )
    );
    const USAGE_VARIANT = ANY_STRING('variant', 'вариант команды');
    super([
      {argument: COMMAND_PREFIX, isOptional: false},
      {argument: FOREIGN_COMMAND_PREFIX, isOptional: true},
      {argument: USAGE_VARIANT, isOptional: true},
    ]);
    this.COMMAND_PREFIX = COMMAND_PREFIX;
    this.FOREIGN_COMMAND_PREFIX = FOREIGN_COMMAND_PREFIX;
    this.USAGE_VARIANT = USAGE_VARIANT;
    this.textProcessor = textProcessor;
    this.commands = commands;
  }

  matchVkMessage(ctx: VkMessageContext): CommandMatchResult<HelpExecutionArgs> {
    const fail = CommandMatchResult.fail<HelpExecutionArgs>();
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
    const ownCommandPrefix = argsProcessor
      .use(this.COMMAND_PREFIX)
      .at(0)
      .extract();
    const commandPrefix = argsProcessor
      .use(this.FOREIGN_COMMAND_PREFIX)
      .at(0)
      .extract();
    const commandUsageVariant = argsProcessor
      .use(this.USAGE_VARIANT)
      .at(0)
      .extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (ownCommandPrefix === undefined) {
      return fail;
    }
    return CommandMatchResult.ok({
      commandPrefix: commandPrefix,
      usageVariant: commandUsageVariant,
    });
  }

  async process(args: HelpExecutionArgs): Promise<HelpViewParams> {
    const prefixToDescribe = args.commandPrefix;
    if (prefixToDescribe === undefined) {
      return {
        commandList: [this, ...this.commands],
      };
    }
    if (this.prefixes.matchIgnoringCase(prefixToDescribe)) {
      return {
        commandPrefixInput: prefixToDescribe,
        command: this,
      };
    }
    for (const command of this.commands) {
      if (command.prefixes.matchIgnoringCase(prefixToDescribe)) {
        return {
          commandPrefixInput: prefixToDescribe,
          command: command,
          usageVariant: args.usageVariant,
        };
      }
    }
    return {
      commandPrefixInput: prefixToDescribe,
    };
  }

  createOutputMessage(params: HelpViewParams): VkOutputMessage {
    const {commandList, commandPrefixInput, command, usageVariant} = params;
    if (commandList !== undefined) {
      return this.createCommandListMessage(commandList);
    }
    if (command !== undefined) {
      return this.createCommandDescriptionMessage(
        commandPrefixInput!,
        command,
        usageVariant
      );
    }
    return this.createCommandNotFoundMessage(commandPrefixInput!);
  }

  createCommandNotFoundMessage(commandPrefixInput: string): VkOutputMessage {
    return {
      text: `Команда ${commandPrefixInput} не найдена`,
      attachment: undefined,
      buttons: [
        [
          {
            text: 'Список команд',
            command: this.unparse({
              commandPrefix: undefined,
              usageVariant: undefined,
            }),
          },
        ],
      ],
    };
  }

  createCommandListMessage(commandList: VkCommand<unknown, unknown>[]) {
    const commandBriefs = commandList.map(command => {
      const allPrefixes = command.prefixes.join(' | ');
      const description = command.shortDescription;
      // eslint-disable-next-line no-irregular-whitespace
      return `　${allPrefixes} — ${description}`;
    });
    const helpPrefix = this.prefixes[0];
    const text = `
Список команд:
${commandBriefs.join('\n')}

Используйте «${helpPrefix} имя_команды» для получения подробной информации о команде
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createCommandDescriptionMessage(
    commandPrefixInput: string,
    command: VkCommand<unknown, unknown>,
    argGroup: string | undefined
  ): VkOutputMessage {
    const inputPrefixLowercase = commandPrefixInput.toLowerCase();
    const inputPrefixUppercase = commandPrefixInput.toUpperCase();
    const structureElements: string[] = [];
    const usageElements: string[] = [];
    const argDescriptions: string[] = [];
    let hasOptionalArgs = false;
    if (argGroup === undefined && Object.keys(command.argGroups).length > 0) {
      const targetCommandPrefix = commandPrefixInput.toLowerCase();
      const argGroupKeys = Object.keys(command.argGroups);
      const prefixArg = this.COMMAND_PREFIX.unparse(this.prefixes[0]);
      const targetPrefixArg =
        this.FOREIGN_COMMAND_PREFIX.unparse(targetCommandPrefix);
      const usageVariantArg = this.USAGE_VARIANT.unparse(argGroupKeys[0]);
      const usageVariantsArg = usageVariantArg.replace(
        argGroupKeys[0],
        argGroupKeys.join('|')
      );
      const toSeeDetailsString = `${prefixArg} ${targetPrefixArg} ${usageVariantsArg}`;
      const argGroupKeysString = argGroupKeys.join(', ');
      const exampleUsage = this.unparse({
        commandPrefix: targetCommandPrefix,
        usageVariant: pickRandom(argGroupKeys),
      });
      return {
        text: `
Команда ${targetCommandPrefix} имеет следующие варианты использования: 
${argGroupKeysString}.

Используйте «${toSeeDetailsString}» для получения подробностей по каждому варианту.
        `.trim(),
        attachment: undefined,
        buttons: [[{text: exampleUsage, command: exampleUsage}]],
      };
    }
    const targetCommandStructure = (() => {
      if (argGroup === undefined) {
        return command.commandStructure;
      }
      const structureIndices = command.argGroups[argGroup];
      if (structureIndices === undefined) {
        return [];
      }
      return structureIndices.map(i => command.commandStructure[i]);
    })();
    if (targetCommandStructure.length === 0) {
      const targetCommandPrefix = commandPrefixInput.toLowerCase();
      const argGroupKeys = Object.keys(command.argGroups);
      const usageVariantsString =
        argGroupKeys.length === 0
          ? ''
          : `Доступные значения: ${argGroupKeys.map(x => `«${x}»`).join(',')}.`;
      return {
        text: `
Заданного варианта использования команды ${targetCommandPrefix} не существует.
${usageVariantsString}
        `.trim(),
        attachment: undefined,
        buttons: [],
      };
    }
    for (const structureElement of targetCommandStructure) {
      const {argument, isOptional} = structureElement;
      hasOptionalArgs ||= isOptional;
      const isOwnCommandPrefix =
        OWN_COMMAND_PREFIX(command.prefixes).displayName ===
        argument.displayName;
      const adjustedDisplayName = isOwnCommandPrefix
        ? inputPrefixLowercase
        : argument.displayName;
      const argString = isOptional
        ? `[${adjustedDisplayName}]`
        : adjustedDisplayName;
      structureElements.push(argString);
      if (!isOptional || pickRandom([true, false])) {
        if (argument !== this.USAGE_VARIANT) {
          usageElements.push(
            isOwnCommandPrefix
              ? pickRandom([
                  commandPrefixInput,
                  inputPrefixLowercase,
                  inputPrefixUppercase,
                ])
              : argument.usageExample
          );
        }
      }
      if (argument.description === undefined) {
        continue;
      }
      // eslint-disable-next-line no-irregular-whitespace
      argDescriptions.push(`　${argString} — ${argument.description}`);
    }
    const description = command.longDescription;
    const synonymsString =
      command.prefixes.length > 1
        ? '\nСинонимы: ' +
          command.prefixes
            .map(x => x.toLowerCase())
            .filter(x => x !== inputPrefixLowercase)
            .join(', ')
        : '';
    const structureString = structureElements.join('　');
    const usage = command.textProcessor.detokenize(usageElements);
    const usageString = pickRandom([
      usage,
      usage.toLowerCase(),
      usage.toUpperCase(),
    ]);
    const commmandNoticeString =
      command.notice === undefined ? '' : '\n\n' + command.notice;
    const optionalsHint = hasOptionalArgs
      ? '\n\nАргументы в [квадратных скобках] указывать не обязательно'
      : '';
    const text = `
Команда ${inputPrefixLowercase}
${description}${synonymsString}

Использование:
${structureString}
${argDescriptions.join('\n')}${commmandNoticeString}${optionalsHint}

Пример: «${usageString}»
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: [
        [
          {
            text:
              usageString.length <= 40
                ? usageString
                : usageString.substring(0, 37) + '...',
            command: usageString,
          },
        ],
      ],
    };
  }

  unparse(args: HelpExecutionArgs): string {
    const tokens = [this.COMMAND_PREFIX.unparse(this.prefixes[0])];
    if (args.commandPrefix !== undefined) {
      tokens.push(this.FOREIGN_COMMAND_PREFIX.unparse(args.commandPrefix));
    }
    if (args.usageVariant !== undefined) {
      tokens.push(this.USAGE_VARIANT.unparse(args.usageVariant));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

type HelpExecutionArgs = {
  commandPrefix: string | undefined;
  usageVariant: string | undefined;
};

type HelpViewParams = {
  commandList?: VkCommand<unknown, unknown>[];
  commandPrefixInput?: string;
  command?: VkCommand<unknown, unknown>;
  usageVariant?: string;
};
