import {APP_CODE_NAME} from '../../../App';
import {pickRandom} from '../../../primitives/Arrays';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {Help, HelpExecutionArgs} from '../../commands/Help';
import {TextCommand} from '../../commands/base/TextCommand';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {OWN_COMMAND_PREFIX} from '../../common/arg_processing/CommandArguments';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class HelpVk extends Help<VkMessageContext, VkOutputMessage> {
  matchMessage(ctx: VkMessageContext): CommandMatchResult<HelpExecutionArgs> {
    const fail = CommandMatchResult.fail<HelpExecutionArgs>();
    const command: string | undefined = (() => {
      if (ctx.messagePayload?.target === APP_CODE_NAME) {
        return ctx.messagePayload.command;
      }
      return ctx.text;
    })();
    if (command === undefined) {
      return fail;
    }
    return this.matchText(command);
  }

  createCommandNotFoundMessage(
    commandPrefixInput: string
  ): MaybeDeferred<VkOutputMessage> {
    return MaybeDeferred.fromValue({
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
    });
  }

  createCommandListMessage(
    commandList: TextCommand<unknown, unknown, unknown, unknown>[]
  ): MaybeDeferred<VkOutputMessage> {
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
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createCommandDescriptionMessage(
    commandPrefixInput: string,
    command: TextCommand<unknown, unknown, unknown, unknown>,
    argGroup: string | undefined
  ): MaybeDeferred<VkOutputMessage> {
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
      const description = command.longDescription;
      const synonymsString =
        command.prefixes.length > 1
          ? '\nСинонимы: ' +
            command.prefixes
              .map(x => x.toLowerCase())
              .filter(x => x !== inputPrefixLowercase)
              .join(', ')
          : '';
      return MaybeDeferred.fromValue({
        text: `
Команда ${inputPrefixLowercase}
${description}${synonymsString}

Команда имеет следующие варианты использования: 
${argGroupKeysString}.

Используйте «${toSeeDetailsString}» для получения подробностей по каждому варианту
        `.trim(),
        attachment: undefined,
        buttons: [[{text: exampleUsage, command: exampleUsage}]],
      });
    }
    const targetCommandStructure = (() => {
      if (argGroup === undefined) {
        return command.commandStructure;
      }
      const structureIndices = command.argGroups[argGroup];
      if (structureIndices === undefined) {
        return [];
      }
      return structureIndices.memberIndices.map(
        i => command.commandStructure[i]
      );
    })();
    if (targetCommandStructure.length === 0) {
      const targetCommandPrefix = commandPrefixInput.toLowerCase();
      const argGroupKeys = Object.keys(command.argGroups);
      const usageVariantsString =
        argGroupKeys.length === 0
          ? ''
          : `Доступные значения: ${argGroupKeys.map(x => `«${x}»`).join(',')}.`;
      return MaybeDeferred.fromValue({
        text: `
Заданного варианта использования команды ${targetCommandPrefix} не существует
${usageVariantsString}
        `.trim(),
        attachment: undefined,
        buttons: [],
      });
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
    const maybeArgGroup =
      argGroup === undefined ? '' : ` (${argGroup.toLowerCase()})`;
    const description =
      argGroup === undefined
        ? command.longDescription
        : command.argGroups[argGroup].description;
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
    const variantNoticesString =
      argGroup !== undefined && command.argGroups[argGroup].notices.length !== 0
        ? '\n\n' + command.argGroups[argGroup].notices.join('\n\n')
        : '';
    const commmandNoticesString =
      command.notices.length === 0 ? '' : '\n\n' + command.notices.join('\n\n');
    const optionalsHint = hasOptionalArgs
      ? '\n\nАргументы в [квадратных скобках] указывать не обязательно'
      : '';
    const text = `
Команда ${inputPrefixLowercase}${maybeArgGroup}
${description}${synonymsString}

Использование:
${structureString}
${argDescriptions.join('\n')}${variantNoticesString}${commmandNoticesString}${optionalsHint}

Пример: «${usageString}»
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: [
        [
          {
            text: usageString,
            command: usageString,
          },
        ],
      ],
    });
  }
}
