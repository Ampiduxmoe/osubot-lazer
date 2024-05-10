import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {APP_CODE_NAME} from '../../../App';
import {
  VK_FOREIGN_COMMAND_PREFIX,
  OWN_COMMAND_PREFIX,
} from '../../common/arg_processing/CommandArguments';
import {pickRandom} from '../../../../primitives/Arrays';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {CommandPrefixes} from '../../common/CommandPrefixes';

export class Help extends VkCommand<HelpExecutionArgs, HelpViewParams> {
  internalName = Help.name;
  shortDescription = 'информация о командах';
  longDescription = 'Отображает информацию о доступных командах';

  static prefixes = new CommandPrefixes('osubot', 'osubot-help');
  prefixes = Help.prefixes;

  private COMMAND_PREFIX = new OWN_COMMAND_PREFIX(this.prefixes);
  commandStructure = [
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: VK_FOREIGN_COMMAND_PREFIX, isOptional: true},
  ];

  commands: VkCommand<unknown, unknown>[];
  constructor(commands: VkCommand<unknown, unknown>[]) {
    super();
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
      .use(VK_FOREIGN_COMMAND_PREFIX)
      .at(0)
      .extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (ownCommandPrefix === undefined) {
      return fail;
    }
    if (!this.prefixes.matchIgnoringCase(ownCommandPrefix)) {
      return fail;
    }
    return CommandMatchResult.ok({
      commandPrefix: commandPrefix,
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
        };
      }
    }
    return {
      commandPrefixInput: prefixToDescribe,
    };
  }

  createOutputMessage(params: HelpViewParams): VkOutputMessage {
    const {commandList, commandPrefixInput, command} = params;
    if (commandList !== undefined) {
      return this.createCommandListMessage(commandList);
    }
    if (command !== undefined) {
      return this.createCommandDescriptionMessage(commandPrefixInput!, command);
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
    command: VkCommand<unknown, unknown>
  ): VkOutputMessage {
    const structureElements: string[] = [];
    const usageElements: string[] = [];
    const argDescriptions: string[] = [];
    let hasOptionalArgs = false;
    for (const structureElement of command.commandStructure) {
      const {argument, isOptional} = structureElement;
      hasOptionalArgs ||= isOptional;
      const argString = isOptional
        ? `[${argument.displayName}]`
        : argument.displayName;
      structureElements.push(argString);
      if (!isOptional || pickRandom([true, false])) {
        usageElements.push(argument.usageExample);
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
      ? 'Аргументы в [квадратных скобках] указывать не обязательно\n'
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
      buttons: [[{text: usageString, command: usageString}]],
    };
  }
}

type HelpExecutionArgs = {
  commandPrefix: string | undefined;
};

type HelpViewParams = {
  commandList?: VkCommand<unknown, unknown>[];
  commandPrefixInput?: string;
  command?: VkCommand<unknown, unknown>;
};
