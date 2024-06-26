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

export class Help extends VkCommand<HelpExecutionArgs, HelpViewParams> {
  internalName = Help.name;
  shortDescription = 'информация о командах';
  longDescription = 'Отображает информацию о доступных командах';

  static prefixes = new CommandPrefixes('osubot', 'osubot-help');
  prefixes = Help.prefixes;

  private COMMAND_PREFIX: CommandArgument<string>;
  private FOREIGN_COMMAND_PREFIX: CommandArgument<string>;
  private USAGE_VARIANT: CommandArgument<string>;

  commands: VkCommand<unknown, unknown>[];
  constructor(commands: VkCommand<unknown, unknown>[]) {
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
    const splitSequence = ' ';
    const tokens = command.split(splitSequence);
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
      buttons: [[{text: 'Список команд', command: this.prefixes[0]}]],
    };
  }

  createCommandListMessage(commandList: VkCommand<unknown, unknown>[]) {
    const commandBriefs = commandList.map(command => {
      const allPrefixes = command.prefixes.join(' | ');
      const description = command.shortDescription;
      // eslint-disable-next-line no-irregular-whitespace
      return `　${allPrefixes} - ${description}`;
    });
    const helpPrefix = this.prefixes[0];
    const text = `
Список команд:
${commandBriefs.join('\n')}

Используйте "${helpPrefix} имя_команды" для получения подробной информации о команде
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
    const structureElements: string[] = [];
    const usageElements: string[] = [];
    const argDescriptions: string[] = [];
    let hasOptionalArgs = false;
    if (argGroup === undefined && Object.keys(command.argGroups).length > 0) {
      const targetCommandPrefix = commandPrefixInput.toLowerCase();
      const argGroupKeys = Object.keys(command.argGroups);
      const argGroupKeysString = argGroupKeys.join(', ');
      const exampleUsage = `${this.prefixes[0]} ${targetCommandPrefix} ${pickRandom(argGroupKeys)}`;
      return {
        text: `
Команда ${targetCommandPrefix} имеет следующие варианты использования: 
${argGroupKeysString}.

Используйте "${this.prefixes[0]} ${targetCommandPrefix} ${argGroupKeys.join('|')}" для получения подробностей по каждому варианту.
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
      return {
        text: `
Заданного варианта использования команды ${targetCommandPrefix} не существует.
Доступные значения: ${argGroupKeys.map(x => `"${x}"`).join(',')}.
        `.trim(),
        attachment: undefined,
        buttons: [],
      };
    }
    for (const structureElement of targetCommandStructure) {
      const {argument, isOptional} = structureElement;
      hasOptionalArgs ||= isOptional;
      const argString = isOptional
        ? `[${argument.displayName}]`
        : argument.displayName;
      structureElements.push(argString);
      if (!isOptional || pickRandom([true, false])) {
        if (argument !== this.USAGE_VARIANT) {
          usageElements.push(argument.usageExample);
        }
      }
      if (argument.description === undefined) {
        continue;
      }
      // eslint-disable-next-line no-irregular-whitespace
      argDescriptions.push(`　${argString} - ${argument.description}`);
    }
    const description = command.longDescription;
    const structureString = structureElements.join('　');
    const usageString = usageElements.join(' ');
    const optionalsHint = hasOptionalArgs
      ? '\nАргументы в [квадратных скобках] указывать не обязательно\n'
      : '';
    const text = `
Команда ${commandPrefixInput.toLowerCase()}
${description}

Использование:
${structureString}
${argDescriptions.join('\n')}
${optionalsHint}
Пример: "${usageString}"
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
